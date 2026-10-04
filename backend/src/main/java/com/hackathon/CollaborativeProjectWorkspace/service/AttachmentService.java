package com.hackathon.CollaborativeProjectWorkspace.service;

import com.hackathon.CollaborativeProjectWorkspace.dto.AttachmentResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectEventDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.ActivityLog;
import com.hackathon.CollaborativeProjectWorkspace.entity.Attachments;
import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.exception.BadRequestException;
import com.hackathon.CollaborativeProjectWorkspace.exception.ResourceNotFoundException;
import com.hackathon.CollaborativeProjectWorkspace.repository.ActivityLogRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.AttachmentsRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.TasksRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttachmentService {

    private final AttachmentsRepository attachmentsRepository;
    private final TasksRepository tasksRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ProjectService projectService;
    private final ProjectEventPublisher eventPublisher;

    private final Path uploadLocation = Paths.get("uploads").toAbsolutePath().normalize();

    @Transactional
    public AttachmentResponseDTO uploadAttachment(Long taskId, MultipartFile file, User currentUser) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded file cannot be empty");
        }

        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        Long projectId = task.getProject().getProjectId();
        projectService.validateUserInProject(projectId, currentUser.getUserId());

        try {
            if (!Files.exists(uploadLocation)) {
                Files.createDirectories(uploadLocation);
            }

            String originalFilename = StringUtils.cleanPath(
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "file"
            );
            String storedFileName = UUID.randomUUID() + "_" + originalFilename;
            Path targetPath = uploadLocation.resolve(storedFileName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/api/attachments/download/" + storedFileName;

            Attachments attachment = Attachments.builder()
                    .task(task)
                    .uploadedBy(currentUser)
                    .fileName(originalFilename)
                    .fileUrl(fileUrl)
                    .fileSize(file.getSize())
                    .build();

            Attachments saved = attachmentsRepository.save(attachment);

            // Activity log (best-effort)
            try {
                activityLogRepository.save(ActivityLog.builder()
                        .user(currentUser)
                        .project(task.getProject())
                        .task(task)
                        .activityType(ActivityLog.ActivityType.ATTACHMENT_UPLOADED)
                        .description(currentUser.getUsername() + " attached '" + originalFilename + "' to task '" + task.getTitle() + "'")
                        .build());
            } catch (Exception e) {
                log.warn("Failed to save activity log for attachment: {}", e.getMessage());
            }

            AttachmentResponseDTO responseDTO = toAttachmentResponseDTO(saved);

            // Broadcast real-time WebSocket event
            eventPublisher.publishEvent(ProjectEventDTO.builder()
                    .eventType("attachment_added")
                    .projectId(projectId)
                    .taskId(taskId)
                    .actorId(currentUser.getUserId())
                    .actorName(currentUser.getUsername())
                    .message(currentUser.getUsername() + " attached " + originalFilename)
                    .data(responseDTO)
                    .build());

            return responseDTO;

        } catch (IOException ex) {
            throw new RuntimeException("Could not store file: " + ex.getMessage(), ex);
        }
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponseDTO> getAttachmentsByTaskId(Long taskId, User currentUser) {
        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        projectService.validateUserInProject(task.getProject().getProjectId(), currentUser.getUserId());

        List<Attachments> list = attachmentsRepository.findByTaskIdWithUploader(taskId);
        return list.stream()
                .map(this::toAttachmentResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Resource loadFileAsResource(String storedFileName) {
        try {
            Path filePath = uploadLocation.resolve(storedFileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File not found: " + storedFileName);
            }
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("File not found: " + storedFileName);
        }
    }

    @Transactional
    public void deleteAttachment(Long attachmentId, User currentUser) {
        Attachments attachment = attachmentsRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found with id: " + attachmentId));

        Long projectId = attachment.getTask().getProject().getProjectId();
        projectService.validateUserInProject(projectId, currentUser.getUserId());

        // Delete physical file
        try {
            String storedFileName = attachment.getFileUrl().replace("/api/attachments/download/", "");
            Path filePath = uploadLocation.resolve(storedFileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (Exception e) {
            log.warn("Failed to delete physical file: {}", e.getMessage());
        }

        attachmentsRepository.delete(attachment);

        // Activity log
        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(attachment.getTask().getProject())
                    .task(attachment.getTask())
                    .activityType(ActivityLog.ActivityType.ATTACHMENT_DELETED)
                    .description(currentUser.getUsername() + " deleted attachment '" + attachment.getFileName() + "'")
                    .build());
        } catch (Exception e) {
            log.warn("Failed to save activity log: {}", e.getMessage());
        }

        // Broadcast event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("attachment_deleted")
                .projectId(projectId)
                .taskId(attachment.getTask().getId())
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " removed an attachment")
                .data(attachmentId)
                .build());
    }

    public AttachmentResponseDTO toAttachmentResponseDTO(Attachments attachment) {
        return AttachmentResponseDTO.builder()
                .id(attachment.getId())
                .taskId(attachment.getTask().getId())
                .fileName(attachment.getFileName())
                .fileUrl(attachment.getFileUrl())
                .fileSize(attachment.getFileSize())
                .uploadedById(attachment.getUploadedBy().getUserId())
                .uploadedByName(attachment.getUploadedBy().getUsername())
                .uploadedAt(attachment.getUploadedAt())
                .build();
    }
}
