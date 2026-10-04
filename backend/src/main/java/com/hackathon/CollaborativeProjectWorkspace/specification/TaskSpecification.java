package com.hackathon.CollaborativeProjectWorkspace.specification;

import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class TaskSpecification {

    public static Specification<Tasks> filterTasks(
            Long projectId,
            Long assigneeId,
            Tasks.TaskStatus status,
            LocalDateTime deadlineBefore,
            LocalDateTime deadlineAfter
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by project (required)
            if (projectId != null) {
                predicates.add(cb.equal(root.get("project").get("projectId"), projectId));
            }

            // Filter by assignee
            if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignee").get("userId"), assigneeId));
            }

            // Filter by status (TODO, IN_PROGRESS, REVIEW, DONE)
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // Filter by deadline (due on or before deadlineBefore)
            if (deadlineBefore != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("deadline"), deadlineBefore));
            }

            // Filter by deadline (due on or after deadlineAfter)
            if (deadlineAfter != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("deadline"), deadlineAfter));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
