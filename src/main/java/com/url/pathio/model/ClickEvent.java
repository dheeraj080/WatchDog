package com.url.pathio.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
        name = "click_events",
        indexes = {
                @Index(name = "idx_click_mapping_time", columnList = "url_mapping_id, click_time DESC")
        }
)
public class ClickEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(name = "click_time", nullable = false, updatable = false)
    private Instant clickTime;

    @Column(name = "ip_address", length = 45) // Length 45 properly supports IPv6
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT") // TEXT prevents truncation for unusually long headers
    private String userAgent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "url_mapping_id", nullable = false)
    private UrlMapping urlMapping;
}