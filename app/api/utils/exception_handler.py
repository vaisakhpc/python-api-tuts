# api/utils/exception_handler.py
from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.exceptions import ValidationError

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    # Custom handling for ValidationError (HTTP 400)
    if isinstance(exc, ValidationError):
        # Extract message
        msg = response.data
        # Flatten lists/dicts recursively to a string (optional, adjust to your needs)
        if isinstance(msg, dict):
            # eg, {'field': ['this field is required']}
            message = next(iter(msg.values()))
            if isinstance(message, list):
                message = message[0]
        elif isinstance(msg, list):
            message = msg[0]
        else:
            message = str(msg)
        
        response.data = {
            'statusCode': 400,
            'errorMessage': message
        }
        # This ensures all ValidationErrors look uniform

    return response
