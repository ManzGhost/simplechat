package com.simplechat.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "call_history")
public class CallHistory {

    @Id
    private String id;

    @Indexed
    private String callerId;

    @Indexed
    private String receiverId;

    @Indexed
    private String conversationId;

    private String callType; // "VOICE" or "VIDEO"

    private String status; // "COMPLETED", "MISSED", "REJECTED", "CANCELLED"

    private int durationSeconds = 0;

    private Instant startedAt;

    private Instant endedAt;

    private Instant createdAt = Instant.now();

    public CallHistory() {}

    public CallHistory(String callerId, String receiverId, String conversationId, String callType, String status, int durationSeconds) {
        this.callerId = callerId;
        this.receiverId = receiverId;
        this.conversationId = conversationId;
        this.callType = callType;
        this.status = status;
        this.durationSeconds = durationSeconds;
        this.startedAt = Instant.now().minusSeconds(durationSeconds);
        this.endedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCallerId() { return callerId; }
    public void setCallerId(String callerId) { this.callerId = callerId; }

    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getCallType() { return callType; }
    public void setCallType(String callType) { this.callType = callType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
