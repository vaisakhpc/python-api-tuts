# api/utils/renderer.py
from rest_framework.renderers import JSONRenderer


class EnvelopeJSONRenderer(JSONRenderer):
    """
    Renders the response as:
    {
        "statusCode": <http status code (int)>,
        "data": <payload>,
        "errorMessage": <optional, if applicable>
    }
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get("response", None) if renderer_context else None
        status_code = (
            response.status_code
            if response and hasattr(response, "status_code")
            else 200
        )
        envelope = {
            "statusCode": status_code,
        }
        # If data is an error key from exception handler, move to errorMessage
        if isinstance(data, dict) and "error_message" in data:
            envelope["errorMessage"] = data.get("error_message")
        elif isinstance(data, dict) and "errorMessage" in data:
            envelope["errorMessage"] = data.get("errorMessage")
        elif isinstance(data, dict) and "error" in data:
            envelope["errorMessage"] = data.get("error")
        # Don't wrap already enveloped data, for safety
        elif isinstance(data, dict) and "statusCode" in data and "data" in data:
            return super().render(data, accepted_media_type, renderer_context)
        else:
            envelope["data"] = data
        return super().render(envelope, accepted_media_type, renderer_context)
