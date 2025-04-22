package main

import (
    "fmt"
    "net/http"

    "github.com/permitio/permit-golang/pkg/config"
    "github.com/permitio/permit-golang/pkg/enforcement"
    "github.com/permitio/permit-golang/pkg/permit"

)

const (
port = 4000
)

func main() {

permitClient := permit.NewPermit(
config.NewConfigBuilder(
"{{API_KEY}}").
WithPdpUrl("http://localhost:7766").
Build(),
)

    
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        
        user := enforcement.UserBuilder("{{USER_ID}}").
            WithFirstName("{{FIRST_NAME}}").
            WithLastName("{{LAST_NAME}}").
            WithEmail("{{EMAIL}}").
            Build()

        
        resource := enforcement.ResourceBuilder("{{RESOURCES}}").Build()

        
        permitted, err := permitClient.Check(user, "{{ACTIONS}}", resource)
        if err != nil {
            fmt.Println(err)
            return
        }
        if permitted {
            w.WriteHeader(http.StatusOK)
            _, err = w.Write([]byte(fmt.Sprintf("%s %s is PERMITTED to %s %s!", user.FirstName, user.LastName, "{{ACTIONS}}" , resource.Type)))
        } else {
            w.WriteHeader(http.StatusForbidden)
            _, err = w.Write([]byte(fmt.Sprintf("%s %s is NOT PERMITTED to %s %s!", user.FirstName, user.LastName, "{{ACTIONS}}" , resource.Type)))
        }
    })
    fmt.Printf("Listening on http://localhost:%d", port)
    http.ListenAndServe(fmt.Sprintf(":%d", port), nil)

}