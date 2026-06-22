from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel


from app.api.routes.auth import get_current_user
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()

class ChatMessage(BaseModel):
    role: str # "user" o "model"
    text: str

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str

class ChatResponse(BaseModel):
    reply: str

SYSTEM_PROMPT = """
Eres el Profesor Ohm, un tutor experto en electrónica de un laboratorio virtual. 
Tu objetivo es explicar de forma didáctica conceptos de electrónica, desde lo más básico hasta niveles avanzados.
Debes ser alentador, usar analogías fáciles de entender (como el flujo de agua para la corriente), y guiar al estudiante a pensar la solución antes de dársela directamente si te preguntan sobre un problema de diagnóstico.
Mantén tus respuestas estructuradas usando Markdown, listas y viñetas para mayor claridad.
"""

@router.post("/chat", response_model=ChatResponse)
def tutor_chat(
    req: ChatRequest,
    current_user = Depends(get_current_user)
) -> Any:
    """Envía un mensaje al Tutor IA y recibe la respuesta."""
    api_key = settings.GEMINI_API_KEY
    
    if not api_key:
        # Mock Response si no hay API key
        return ChatResponse(
            reply=(
                "¡Hola! Soy el **Profesor Ohm** 🤖⚡. \n\n"
                "> **Aviso del Sistema:** La integración con el LLM real no está activa porque falta la variable de entorno `GEMINI_API_KEY`.\n\n"
                "Para activar mis verdaderas capacidades de inteligencia artificial, por favor configura tu clave de API de Google Gemini en el backend.\n\n"
                "Mientras tanto, puedo decirte que la Ley de Ohm es fundamental: **V = I × R**.\n"
                "¿En qué más te puedo ayudar hoy?"
            )
        )
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Configurar modelo con el system instruction
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT
        )
        
        # Formatear el historial para Gemini
        gemini_history = []
        for msg in req.history:
            # Gemini usa "user" y "model"
            role = "user" if msg.role == "user" else "model"
            gemini_history.append({"role": role, "parts": [msg.text]})
            
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(req.message)
        
        return ChatResponse(reply=response.text)
        
    except Exception as e:
        import logging
        logging.error(f"Error en Tutor IA: {e}")
        raise HTTPException(status_code=500, detail="Error al comunicarse con la IA")
