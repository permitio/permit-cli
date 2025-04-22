import asyncio

from permit import Permit
from fastapi import FastAPI, status, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

permit = Permit(
    pdp="http://localhost:7766",  
    token="{{API_KEY}}",
)

user = {
    "id": "{{USER_ID}}",
    "firstName": "{{FIRST_NAME}}",
    "lastName": "{{LAST_NAME}}",
    "email": "{{EMAIL}}",
}  

@app.get("/")
async def check_permissions():  
    permitted = await permit.check(user["id"], "{{ACTIONS}}", "{{RESOURCES}}")
    if not permitted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={
            "result": f"{user.get('firstName')} {user.get('lastName')} is NOT PERMITTED to {{ACTIONS}} {{RESOURCES}}!"
        })

    return JSONResponse(status_code=status.HTTP_200_OK, content={
        "result": f"{user.get('firstName')} {user.get('lastName')} is PERMITTED to {{ACTIONS}} {{RESOURCES}}!"
    })