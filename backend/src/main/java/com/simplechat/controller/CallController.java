package com.simplechat.controller;

import com.simplechat.model.CallHistory;
import com.simplechat.repository.CallHistoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calls")
@CrossOrigin(origins = "*")
public class CallController {

    private final CallHistoryRepository callHistoryRepository;

    public CallController(CallHistoryRepository callHistoryRepository) {
        this.callHistoryRepository = callHistoryRepository;
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<CallHistory>> getCallHistory(@PathVariable String userId) {
        List<CallHistory> history = callHistoryRepository.findByCallerIdOrReceiverIdOrderByCreatedAtDesc(userId, userId);
        return ResponseEntity.ok(history);
    }

    @PostMapping("/history")
    public ResponseEntity<CallHistory> saveCallRecord(@RequestBody Map<String, Object> body) {
        String callerId = (String) body.get("callerId");
        String receiverId = (String) body.get("receiverId");
        String conversationId = (String) body.get("conversationId");
        String callType = (String) body.getOrDefault("callType", "VOICE");
        String status = (String) body.getOrDefault("status", "COMPLETED");
        int durationSeconds = 0;
        if (body.get("durationSeconds") instanceof Number) {
            durationSeconds = ((Number) body.get("durationSeconds")).intValue();
        }

        CallHistory record = new CallHistory(callerId, receiverId, conversationId, callType, status, durationSeconds);
        CallHistory saved = callHistoryRepository.save(record);
        return ResponseEntity.ok(saved);
    }
}
