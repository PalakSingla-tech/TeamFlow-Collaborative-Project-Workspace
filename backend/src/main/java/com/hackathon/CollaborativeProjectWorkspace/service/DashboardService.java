package com.hackathon.CollaborativeProjectWorkspace.service;

import com.hackathon.CollaborativeProjectWorkspace.dto.MemberWorkloadDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectDashboardDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.ProjectMembers;
import com.hackathon.CollaborativeProjectWorkspace.entity.Projects;
import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.exception.ResourceNotFoundException;
import com.hackathon.CollaborativeProjectWorkspace.repository.ProjectMembersRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.ProjectsRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.TasksRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectsRepository projectsRepository;
    private final TasksRepository tasksRepository;
    private final ProjectMembersRepository projectMembersRepository;
    private final ProjectService projectService;

    @Transactional(readOnly = true)
    public ProjectDashboardDTO getProjectDashboard(Long projectId, User currentUser) {
        Projects project = projectsRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        projectService.validateUserInProject(projectId, currentUser.getUserId());

        List<Tasks> tasks = tasksRepository.findByProjectIdWithAssignee(projectId);
        List<ProjectMembers> members = projectMembersRepository.findMembersWithUserByProjectId(projectId);

        long totalTasks = tasks.size();

        // Tasks by status
        Map<String, Long> tasksByStatus = new LinkedHashMap<>();
        for (Tasks.TaskStatus status : Tasks.TaskStatus.values()) {
            tasksByStatus.put(status.name(), 0L);
        }
        for (Tasks task : tasks) {
            tasksByStatus.put(task.getStatus().name(), tasksByStatus.get(task.getStatus().name()) + 1);
        }

        // Completion percentage
        long doneTasks = tasksByStatus.getOrDefault(Tasks.TaskStatus.DONE.name(), 0L);
        double completionPercentage = totalTasks > 0
                ? Math.round((doneTasks * 100.0 / totalTasks) * 10.0) / 10.0
                : 0.0;

        // Overdue and upcoming tasks
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        LocalDate endOfWeek = today.plusDays(7);

        long overdueTasks = tasks.stream()
                .filter(t -> t.getDeadline() != null && t.getDeadline().isBefore(now) && t.getStatus() != Tasks.TaskStatus.DONE)
                .count();

        long tasksDueToday = tasks.stream()
                .filter(t -> t.getDeadline() != null
                        && t.getDeadline().toLocalDate().isEqual(today)
                        && t.getStatus() != Tasks.TaskStatus.DONE)
                .count();

        long tasksDueThisWeek = tasks.stream()
                .filter(t -> t.getDeadline() != null
                        && !t.getDeadline().toLocalDate().isBefore(today)
                        && !t.getDeadline().toLocalDate().isAfter(endOfWeek)
                        && t.getStatus() != Tasks.TaskStatus.DONE)
                .count();

        // Member workloads
        List<MemberWorkloadDTO> memberWorkloads = new ArrayList<>();
        Map<Long, List<Tasks>> tasksByAssignee = new HashMap<>();
        List<Tasks> unassignedTasks = new ArrayList<>();

        for (Tasks task : tasks) {
            if (task.getAssignee() != null) {
                tasksByAssignee.computeIfAbsent(task.getAssignee().getUserId(), k -> new ArrayList<>()).add(task);
            } else {
                unassignedTasks.add(task);
            }
        }

        for (ProjectMembers member : members) {
            Long userId = member.getUser().getUserId();
            String username = member.getUser().getUsername();
            List<Tasks> assigned = tasksByAssignee.getOrDefault(userId, Collections.emptyList());

            long memberTotal = assigned.size();
            long memberDone = assigned.stream().filter(t -> t.getStatus() == Tasks.TaskStatus.DONE).count();
            long memberPending = memberTotal - memberDone;

            memberWorkloads.add(MemberWorkloadDTO.builder()
                    .userId(userId)
                    .username(username)
                    .totalTasks(memberTotal)
                    .completedTasks(memberDone)
                    .pendingTasks(memberPending)
                    .build());
        }

        if (!unassignedTasks.isEmpty()) {
            long unassignedDone = unassignedTasks.stream().filter(t -> t.getStatus() == Tasks.TaskStatus.DONE).count();
            memberWorkloads.add(MemberWorkloadDTO.builder()
                    .userId(null)
                    .username("Unassigned")
                    .totalTasks(unassignedTasks.size())
                    .completedTasks(unassignedDone)
                    .pendingTasks(unassignedTasks.size() - unassignedDone)
                    .build());
        }

        return ProjectDashboardDTO.builder()
                .projectId(projectId)
                .projectName(project.getName())
                .totalTasks(totalTasks)
                .tasksByStatus(tasksByStatus)
                .completionPercentage(completionPercentage)
                .overdueTasks(overdueTasks)
                .tasksDueToday(tasksDueToday)
                .tasksDueThisWeek(tasksDueThisWeek)
                .memberWorkloads(memberWorkloads)
                .build();
    }
}
