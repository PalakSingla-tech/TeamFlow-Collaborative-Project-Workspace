package com.hackathon.CollaborativeProjectWorkspace.service;

import com.hackathon.CollaborativeProjectWorkspace.dto.CommentResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.CreateCommentRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectEventDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.ActivityLog;
import com.hackathon.CollaborativeProjectWorkspace.entity.Comments;
import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.exception.BadRequestException;
import com.hackathon.CollaborativeProjectWorkspace.exception.ResourceNotFoundException;
import com.hackathon.CollaborativeProjectWorkspace.repository.ActivityLogRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.CommentsRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.TasksRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final CommentsRepository commentsRepository;
    private final TasksRepository tasksRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ProjectService projectService;
    private final ProjectEventPublisher eventPublisher;

    @Transactional
    public CommentResponseDTO addComment(Long taskId, CreateCommentRequestDTO request, User currentUser) {
        if (request == null || request.getBody() == null || request.getBody().trim().isEmpty()) {
            throw new BadRequestException("Comment body cannot be blank");
        }

        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        Long projectId = task.getProject().getProjectId();
        projectService.validateUserInProject(projectId, currentUser.getUserId());

        Comments comment = Comments.builder()
                .task(task)
                .author(currentUser)
                .body(request.getBody().trim())
                .build();

        Comments saved = commentsRepository.save(comment);

        // Activity log (best-effort)
        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(task.getProject())
                    .task(task)
                    .activityType(ActivityLog.ActivityType.COMMENT_ADDED)
                    .description(currentUser.getUsername() + " commented on task '" + task.getTitle() + "'")
                    .build());
        } catch (Exception e) {
            log.warn("Failed to save activity log for comment: {}", e.getMessage());
        }

        CommentResponseDTO responseDTO = toCommentResponseDTO(saved);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("comment_added")
                .projectId(projectId)
                .taskId(taskId)
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " commented on this task")
                .data(responseDTO)
                .build());

        return responseDTO;
    }

    @Transactional(readOnly = true)
    public List<CommentResponseDTO> getCommentsByTaskId(Long taskId, User currentUser) {
        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        projectService.validateUserInProject(task.getProject().getProjectId(), currentUser.getUserId());

        List<Comments> comments = commentsRepository.findByTaskIdWithAuthor(taskId);
        return comments.stream()
                .map(this::toCommentResponseDTO)
                .collect(Collectors.toList());
    }

    public CommentResponseDTO toCommentResponseDTO(Comments comment) {
        return CommentResponseDTO.builder()
                .id(comment.getId())
                .taskId(comment.getTask().getId())
                .authorId(comment.getAuthor().getUserId())
                .authorName(comment.getAuthor().getUsername())
                .authorEmail(comment.getAuthor().getEmail())
                .body(comment.getBody())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
