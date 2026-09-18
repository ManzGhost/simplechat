package com.simplechat.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "friend_requests")
public class FriendRequest {

    @Id
    private String id;

    @Indexed
    private String senderId;

    @Indexed
    private String receiverId;

    private String status = "PENDING"; // PENDING, ACCEPTED, REJECTED, CANCELLED

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public FriendRequest() {}

    public FriendRequest(String senderId, String receiverId) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.status = "PENDING";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
