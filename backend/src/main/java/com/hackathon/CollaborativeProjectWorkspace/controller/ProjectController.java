package com.hackathon.CollaborativeProjectWorkspace.controller;

import com.hackathon.CollaborativeProjectWorkspace.dto.AddMemberRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.CreateProjectRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectMemberDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponseDTO> createProject(
            @RequestBody CreateProjectRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        ProjectResponseDTO response = projectService.createProject(request, currentUser);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponseDTO>> getUserProjects(
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(projectService.getUserProjects(currentUser));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponseDTO> getProjectById(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(projectService.getProjectById(projectId, currentUser));
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<ProjectMemberDTO> addMember(
            @PathVariable Long projectId,
            @RequestBody AddMemberRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        ProjectMemberDTO response = projectService.addMemberToProject(projectId, request, currentUser);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{projectId}/join")
    public ResponseEntity<ProjectMemberDTO> joinProject(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser
    ) {
        ProjectMemberDTO response = projectService.joinProject(projectId, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<ProjectMemberDTO>> getProjectMembers(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(projectService.getProjectMembers(projectId, currentUser));
    }
}
