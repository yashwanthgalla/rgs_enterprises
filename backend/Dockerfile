# Stage 1: Build the Maven artifact
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom.xml and dependency sources first to leverage Docker layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy full source and compile
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime image using lightweight Temurin JRE 17
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Non-root user for security
RUN addgroup --system spring && adduser --system spring --ingroup spring
USER spring:spring

COPY --from=builder --chown=spring:spring /app/target/*.jar app.jar

ENV PORT=8080
EXPOSE ${PORT}

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT} -jar app.jar"]

