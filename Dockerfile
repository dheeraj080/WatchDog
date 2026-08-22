# ---- build stage ----
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

RUN sed -i 's/\r$//' mvnw
RUN chmod +x ./mvnw
RUN ./mvnw dependency:go-offline -B

COPY src src
RUN ./mvnw clean package -DskipTests

RUN java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

# ---- runtime stage ----
FROM eclipse-temurin:25-jre-alpine AS runtime
WORKDIR /app

# Install network debugging tools
RUN apk add --no-cache bind-tools iputils

# Ensure we have a system group/users
RUN addgroup -S spring && adduser -S spring -G spring

# ===== ADD THIS SECTION =====
# Create storage directory with proper permissions BEFORE switching to spring user
RUN mkdir -p /app/storage/scheduled_attachments && \
    chown -R spring:spring /app/storage && \
    chmod -R 755 /app/storage
# ============================

# Copying layers
COPY --from=builder --chown=spring:spring /app/target/extracted/dependencies/ ./
COPY --from=builder --chown=spring:spring /app/target/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=spring:spring /app/target/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=spring:spring /app/target/extracted/application/ ./

USER spring:spring

# Updated to 5000 to match Compose file
EXPOSE 5000

ENTRYPOINT ["java", \
  "-XX:TieredStopAtLevel=1", \
  "-XX:+UseContainerSupport", \
  "org.springframework.boot.loader.launch.JarLauncher"]