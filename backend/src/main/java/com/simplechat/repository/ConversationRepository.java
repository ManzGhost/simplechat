package com.simplechat.repository;

import com.simplechat.model.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {
    List<Conversation> findByParticipantIdsContaining(String userId);

    @Query("{ 'participantIds': { $all: [?0, ?1], $size: 2 } }")
    Optional<Conversation> findBetweenUsers(String userA, String userB);
}
