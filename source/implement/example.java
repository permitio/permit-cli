package com.example.myproject;

import io.permit.sdk.Permit;
import io.permit.sdk.PermitConfig;
import io.permit.sdk.api.PermitApiError;
import io.permit.sdk.api.PermitContextError;
import io.permit.sdk.enforcement.Resource;
import io.permit.sdk.enforcement.User;
import io.permit.sdk.openapi.models.UserCreate;
import io.permit.sdk.openapi.models.UserRead;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@SpringBootApplication
public class DemoApplication {

    final Permit permit;
    final UserRead user;

    public DemoApplication() {
        // init the permit SDK
        this.permit = new Permit(
            new PermitConfig.Builder(
              "{{API_KEY}}"
            )
              .withPdpAddress("http://localhost:7766")
              .withDebugMode(true)
              .build()
        );

        try {
            // typically you would sync a user to the permission system
            // and assign an initial role when the user signs up to the system
            this.user = permit.api.users.sync(
                // the user "key" is any id that identifies the user uniquely
                // but is typically taken straight from the user JWT 'sub' claim
                new UserCreate("{{USER_ID}}")
                    .withEmail("{{EMAIL}}")
                    .withFirstName("{{FIRST_NAME}}")
                    .withLastName("{{LAST_NAME}}")
            ).getResult();

            // you can use this api call to assign a role when a user first logs in
            // permit.api.users.assignRole(user.key, "<ROLE KEY>", "<TENANT KEY>");
        } catch (IOException | PermitApiError | PermitContextError e) {
            throw new RuntimeException(e);
        }
    }

    @GetMapping("/")
    ResponseEntity<String> home() throws IOException, PermitApiError, PermitContextError {
        // is 'user' allowed to do 'action' on 'resource'?
        User user = User.fromString(this.user.key); // pass the user *key* to init a user object from string
        String action = "{{ACTIONS}}";
        Resource resource = new Resource.Builder("{{RESOURCES}}")
            // you can set a specific tenant for the permission check
            // .withTenant("<TENANT KEY>")
            .build();

        // to run a permission check, use permit.check()
        boolean permitted = permit.check(user, action, resource);

        if (permitted) {
            return ResponseEntity.status(HttpStatus.OK).body(
                "{{FIRST_NAME}} {{LAST_NAME}} is PERMITTED to {{ACTIONS}} {{RESOURCES}}!"
            );
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                "{{FIRST_NAME}} {{LAST_NAME}} is PERMITTED to {{ACTIONS}} {{RESOURCES}}!"
            );
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}