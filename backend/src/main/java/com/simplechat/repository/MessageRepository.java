package com.simplechat.repository;

import com.simplechat.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByConversationIdOrderByTimestampAsc(String conversationId);
    List<Message> findByConversationIdAndReceiverIdAndSeenFalse(String conversationId, String receiverId);
    void deleteByConversationId(String conversationId);
}
