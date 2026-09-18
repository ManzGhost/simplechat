package com.simplechat.dto;

import java.time.Instant;
import java.util.List;

public class ConversationDTO {
    private String id;
    private List<String> participantIds;
    private List<UserDTO> participants;
    private UserDTO otherUser;
    private MessageDTO lastMessage;
    private Instant lastMessageTimestamp;
    private int unreadCount;
    private Instant createdAt;
    private Instant updatedAt;

    public ConversationDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public List<String> getParticipantIds() { return participantIds; }
    public void setParticipantIds(List<String> participantIds) { this.participantIds = participantIds; }

    public List<UserDTO> getParticipants() { return participants; }
    public void setParticipants(List<UserDTO> participants) { this.participants = participants; }

    public UserDTO getOtherUser() { return otherUser; }
    public void setOtherUser(UserDTO otherUser) { this.otherUser = otherUser; }

    public MessageDTO getLastMessage() { return lastMessage; }
    public void setLastMessage(MessageDTO lastMessage) { this.lastMessage = lastMessage; }

    public Instant getLastMessageTimestamp() { return lastMessageTimestamp; }
    public void setLastMessageTimestamp(Instant lastMessageTimestamp) { this.lastMessageTimestamp = lastMessageTimestamp; }

    public int getUnreadCount() { return unreadCount; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
