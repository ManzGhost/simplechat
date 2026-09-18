package com.simplechat.repository;

import com.simplechat.model.CallHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CallHistoryRepository extends MongoRepository<CallHistory, String> {
    List<CallHistory> findByCallerIdOrReceiverIdOrderByCreatedAtDesc(String callerId, String receiverId);
    List<CallHistory> findByConversationIdOrderByCreatedAtDesc(String conversationId);
}
