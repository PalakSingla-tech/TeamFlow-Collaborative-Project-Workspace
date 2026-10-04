package com.hackathon.CollaborativeProjectWorkspace.service;

import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectEventDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishEvent(ProjectEventDTO event) {
        if (event == null || event.getProjectId() == null) {
            return;
        }

        try {
            // Broadcast to /topic/project/{projectId} (standard STOMP topic)
            String destinationSlash = "/topic/project/" + event.getProjectId();
            messagingTemplate.convertAndSend(destinationSlash, event);

            // Also broadcast to /topic/project.{projectId}
            String destinationDot = "/topic/project." + event.getProjectId();
            messagingTemplate.convertAndSend(destinationDot, event);

            log.info("Broadcasted {} event to project {}: {}", event.getEventType(), event.getProjectId(), event.getMessage());
        } catch (Exception e) {
            log.error("Failed to broadcast WebSocket event: {}", e.getMessage());
        }
    }
}
