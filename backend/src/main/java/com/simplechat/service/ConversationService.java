package com.simplechat.service;

import com.simplechat.dto.ConversationDTO;
import com.simplechat.dto.MessageDTO;
import com.simplechat.dto.UserDTO;
import com.simplechat.exception.BadRequestException;
import com.simplechat.exception.ResourceNotFoundException;
import com.simplechat.exception.UnauthorizedException;
import com.simplechat.model.Conversation;
import com.simplechat.model.Message;
import com.simplechat.model.User;
import com.simplechat.repository.ConversationRepository;
import com.simplechat.repository.MessageRepository;
import com.simplechat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public List<ConversationDTO> getUserConversations(String currentUserId) {
        List<Conversation> conversations = conversationRepository.findByParticipantIdsContaining(currentUserId);

        return conversations.stream()
                .map(conv -> enrichConversation(conv, currentUserId))
                .sorted((a, b) -> {
                    Instant tA = a.getLastMessageTimestamp() != null ? a.getLastMessageTimestamp() : a.getUpdatedAt();
                    Instant tB = b.getLastMessageTimestamp() != null ? b.getLastMessageTimestamp() : b.getUpdatedAt();
                    return tB.compareTo(tA);
                })
                .collect(Collectors.toList());
    }

    public ConversationDTO getOrCreateConversation(String currentUserId, String targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new BadRequestException("Cannot create a conversation with yourself");
        }

        userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        // Check if unique conversation already exists between these 2 users
        Optional<Conversation> existing = conversationRepository.findBetweenUsers(currentUserId, targetUserId);
        Conversation conversation = existing.orElseGet(() -> {
            Conversation newConv = new Conversation(Arrays.asList(currentUserId, targetUserId));
            return conversationRepository.save(newConv);
        });

        return enrichConversation(conversation, currentUserId);
    }

    public void deleteConversation(String conversationId, String currentUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        if (!conversation.getParticipantIds().contains(currentUserId)) {
            throw new UnauthorizedException("You are not a participant in this conversation");
        }

        conversationRepository.deleteById(conversationId);
        messageRepository.deleteByConversationId(conversationId);

        // Notify participants over WebSocket
        Map<String, Object> event = new HashMap<>();
        event.put("type", "CONVERSATION_DELETED");
        event.put("conversationId", conversationId);

        for (String participantId : conversation.getParticipantIds()) {
            messagingTemplate.convertAndSendToUser(participantId, "/queue/messages", event);
        }
    }

    private ConversationDTO enrichConversation(Conversation conversation, String currentUserId) {
        ConversationDTO dto = new ConversationDTO();
        dto.setId(conversation.getId());
        dto.setParticipantIds(conversation.getParticipantIds());
        dto.setCreatedAt(conversation.getCreatedAt());
        dto.setUpdatedAt(conversation.getUpdatedAt());

        // Get participants
        List<User> participants = userRepository.findAllById(conversation.getParticipantIds());
        dto.setParticipants(participants.stream().map(UserDTO::new).collect(Collectors.toList()));

        // Other user
        String otherUserId = conversation.getParticipantIds().stream()
                .filter(id -> !id.equals(currentUserId))
                .findFirst()
                .orElse(currentUserId);

        User otherUser = participants.stream()
                .filter(u -> u.getId().equals(otherUserId))
                .findFirst()
                .orElse(null);
        if (otherUser != null) {
            dto.setOtherUser(new UserDTO(otherUser));
        }

        // Messages
        List<Message> messages = messageRepository.findByConversationIdOrderByTimestampAsc(conversation.getId());
        if (!messages.isEmpty()) {
            Message last = messages.get(messages.size() - 1);
            MessageDTO lastDto = new MessageDTO();
            lastDto.setId(last.getId());
            lastDto.setConversationId(last.getConversationId());
            lastDto.setSenderId(last.getSenderId());
            lastDto.setReceiverId(last.getReceiverId());
            lastDto.setContent(last.getContent());
            lastDto.setMessageType(last.getMessageType());
            lastDto.setTimestamp(last.getTimestamp());
            lastDto.setDelivered(last.isDelivered());
            lastDto.setSeen(last.isSeen());

            dto.setLastMessage(lastDto);
            dto.setLastMessageTimestamp(last.getTimestamp());
        } else {
            dto.setLastMessageTimestamp(conversation.getUpdatedAt());
        }

        // Unread count
        long unread = messages.stream()
                .filter(m -> m.getReceiverId().equals(currentUserId) && !m.isSeen())
                .count();
        dto.setUnreadCount((int) unread);

        return dto;
    }
}
