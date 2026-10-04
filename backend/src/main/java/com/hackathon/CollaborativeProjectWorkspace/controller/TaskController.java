package com.hackathon.CollaborativeProjectWorkspace.controller;

import com.hackathon.CollaborativeProjectWorkspace.dto.*;
import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/api/projects/{projectId}/tasks")
    public ResponseEntity<TaskResponseDTO> createTask(
            @PathVariable Long projectId,
            @RequestBody CreateTaskRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        TaskResponseDTO response = taskService.createTask(projectId, request, currentUser);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/api/projects/{projectId}/tasks")
    public ResponseEntity<Page<TaskResponseDTO>> getProjectTasks(
            @PathVariable Long projectId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Tasks.TaskStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime deadlineBefore,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime deadlineAfter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "id,desc") String sort,
            @AuthenticationPrincipal User currentUser
    ) {
        String[] sortParams = sort.split(",");
        String sortField = sortParams[0];
        Sort.Direction direction = (sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc"))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, sortField));
        Page<TaskResponseDTO> tasks = taskService.getTasks(
                projectId,
                assigneeId,
                status,
                deadlineBefore,
                deadlineAfter,
                pageRequest,
                currentUser
        );
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/api/tasks/{taskId}")
    public ResponseEntity<TaskResponseDTO> getTaskById(
            @PathVariable Long taskId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(taskService.getTaskById(taskId, currentUser));
    }

    @PutMapping("/api/tasks/{taskId}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable Long taskId,
            @RequestBody UpdateTaskRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(taskService.updateTask(taskId, request, currentUser));
    }

    @PatchMapping("/api/tasks/{taskId}")
    public ResponseEntity<TaskResponseDTO> patchTask(
            @PathVariable Long taskId,
            @RequestBody UpdateTaskRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(taskService.updateTask(taskId, request, currentUser));
    }

    @DeleteMapping("/api/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long taskId,
            @AuthenticationPrincipal User currentUser
    ) {
        taskService.deleteTask(taskId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/tasks/{taskId}/assign")
    public ResponseEntity<TaskResponseDTO> assignTask(
            @PathVariable Long taskId,
            @RequestBody AssignTaskRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(taskService.assignTask(taskId, request, currentUser));
    }

    @PatchMapping("/api/tasks/{taskId}/status")
    public ResponseEntity<TaskResponseDTO> changeStatus(
            @PathVariable Long taskId,
            @RequestBody UpdateTaskStatusRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(taskService.changeStatus(taskId, request, currentUser));
    }

    @PatchMapping("/api/tasks/{taskId}/deadline")
    public ResponseEntity<TaskResponseDTO> setDeadline(
            @PathVariable Long taskId,
            @RequestBody UpdateDeadLineRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(taskService.setDeadline(taskId, request, currentUser));
    }
}
