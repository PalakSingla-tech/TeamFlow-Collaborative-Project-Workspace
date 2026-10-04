package com.hackathon.CollaborativeProjectWorkspace.controller;

import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectDashboardDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ProjectDashboardDTO> getDashboard(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(dashboardService.getProjectDashboard(projectId, currentUser));
    }
}
