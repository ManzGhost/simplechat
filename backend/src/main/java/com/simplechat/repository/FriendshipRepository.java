package com.simplechat.repository;

import com.simplechat.model.Friendship;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends MongoRepository<Friendship, String> {
    List<Friendship> findByUser1IdOrUser2Id(String user1Id, String user2Id);
    Optional<Friendship> findByUser1IdAndUser2Id(String user1Id, String user2Id);
}
