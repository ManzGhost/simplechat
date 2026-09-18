package com.simplechat.repository;

import com.simplechat.model.FriendRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends MongoRepository<FriendRequest, String> {
    List<FriendRequest> findByReceiverIdAndStatus(String receiverId, String status);
    List<FriendRequest> findBySenderId(String senderId);
    Optional<FriendRequest> findBySenderIdAndReceiverId(String senderId, String receiverId);
}
