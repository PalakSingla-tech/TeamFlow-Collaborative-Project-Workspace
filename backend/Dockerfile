# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml mvnw mvnw.cmd ./
COPY .mvn .mvn
RUN chmod +x ./mvnw
COPY src src
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN mkdir -p uploads
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8081
ENV PORT=8081
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
