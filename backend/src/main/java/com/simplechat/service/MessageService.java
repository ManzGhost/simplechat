package com.simplechat.service;

import com.simplechat.dto.MessageDTO;
import com.simplechat.dto.SendMessageRequest;
import com.simplechat.exception.ResourceNotFoundException;
import com.simplechat.exception.UnauthorizedException;
import com.simplechat.model.Conversation;
import com.simplechat.model.Message;
import com.simplechat.repository.ConversationRepository;
import com.simplechat.repository.MessageRepository;
import com.simplechat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageService(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public List<MessageDTO> getMessages(String conversationId, String currentUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        if (!conversation.getParticipantIds().contains(currentUserId)) {
            throw new UnauthorizedException("You are not a participant in this conversation");
        }

        return messageRepository.findByConversationIdOrderByTimestampAsc(conversationId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public MessageDTO sendMessage(SendMessageRequest request, String senderId) {
        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseGet(() -> {
                    Conversation newConv = new Conversation(Arrays.asList(senderId, request.getReceiverId()));
                    return conversationRepository.save(newConv);
                });

        boolean isReceiverOnline = userRepository.findById(request.getReceiverId())
                .map(u -> u.isOnline())
                .orElse(false);

        Message message = new Message(
                conversation.getId(),
                senderId,
                request.getReceiverId(),
                request.getContent().trim()
        );
        message.setDelivered(isReceiverOnline);
        message.setSeen(false);
        message.setTimestamp(Instant.now());

        Message saved = messageRepository.save(message);

        conversation.setUpdatedAt(saved.getTimestamp());
        conversationRepository.save(conversation);

        MessageDTO dto = toDto(saved);

        Map<String, Object> wsPayload = new HashMap<>();
        wsPayload.put("type", "CHAT_MESSAGE");
        wsPayload.put("message", dto);

        // Send to receiver's queue
        messagingTemplate.convertAndSendToUser(request.getReceiverId(), "/queue/messages", wsPayload);

        // Send to sender's queue for multi-device sync
        messagingTemplate.convertAndSendToUser(senderId, "/queue/messages", wsPayload);

        return dto;
    }

    public int markAsSeen(String conversationId, String currentUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        List<Message> unread = messageRepository.findByConversationIdAndReceiverIdAndSeenFalse(conversationId, currentUserId);

        for (Message msg : unread) {
            msg.setSeen(true);
            msg.setDelivered(true);
        }
        messageRepository.saveAll(unread);

        String otherUserId = conversation.getParticipantIds().stream()
                .filter(id -> !id.equals(currentUserId))
                .findFirst()
                .orElse(null);

        if (otherUserId != null && !unread.isEmpty()) {
            Map<String, Object> seenEvent = new HashMap<>();
            seenEvent.put("type", "MESSAGES_SEEN");
            seenEvent.put("conversationId", conversationId);
            seenEvent.put("receiverId", currentUserId);

            messagingTemplate.convertAndSendToUser(otherUserId, "/queue/messages", seenEvent);
        }

        return unread.size();
    }

    private MessageDTO toDto(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setConversationId(message.getConversationId());
        dto.setSenderId(message.getSenderId());
        dto.setReceiverId(message.getReceiverId());
        dto.setContent(message.getContent());
        dto.setMessageType(message.getMessageType());
        dto.setTimestamp(message.getTimestamp());
        dto.setDelivered(message.isDelivered());
        dto.setSeen(message.isSeen());
        return dto;
    }
}
