'use client';

import { useState, useRef, useEffect } from 'react';
import {
  HeartPulse,
  Send,
  AlertTriangle,
  Bot,
  User,
  Thermometer,
  Brain,
  Bone,
  FileText,
  MapPin,
  Pill,
  Phone,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hola María, soy tu asistente de salud Poppins. ¿En qué puedo ayudarte? Puedo orientarte sobre síntomas, licencias médicas, o derivarte a atención profesional.',
  timestamp: new Date(),
};

interface QuickAction {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  { label: 'Me siento mal', icon: Thermometer, color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100 border-red-200' },
  { label: 'Dolor de cabeza', icon: Brain, color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { label: 'Dolor de espalda', icon: Bone, color: 'text-amber-600', bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { label: 'Consultar licencia médica', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { label: 'Centros de salud cercanos', icon: MapPin, color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
  { label: 'Mis medicamentos', icon: Pill, color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100 border-pink-200' },
];

// Base de conocimiento médico (Manual Merck + orientación TCP)
const medicalKnowledge: { keywords: string[]; response: string }[] = [
  {
    keywords: ['me siento mal', 'no me siento bien', 'enfermo', 'enferma', 'malestar'],
    response: 'Lamento que no te sientas bien. Para orientarte mejor, necesito que me describas tus síntomas. ¿Tienes alguno de estos?\n\n• Dolor (¿dónde?)\n• Fiebre\n• Mareos o náuseas\n• Dificultad para respirar\n• Diarrea o vómitos\n\n⚠️ Si tienes dificultad para respirar, dolor en el pecho o fiebre muy alta (+39°C), llama al 131 inmediatamente.',
  },
  {
    keywords: ['cabeza', 'cefalea', 'jaqueca', 'migraña'],
    response: '**Dolor de cabeza (Cefalea)**\n\nLas causas más comunes son cefalea tensional y migraña.\n\n**Recomendaciones:**\n1. Hidratarte bien (2+ litros de agua al día)\n2. Descansar en un lugar tranquilo y oscuro\n3. Tomar paracetamol (500-1000mg) o ibuprofeno (400mg)\n4. Aplicar compresas frías en la frente\n\n⚠️ **Consulta de urgencia si:**\n• Dolor de inicio súbito e intenso ("en trueno")\n• Fiebre + rigidez de nuca\n• Cambios en la visión o debilidad\n• Dolor que empeora progresivamente\n• Primer episodio después de los 50 años\n\n¿Necesitas que te ayude a solicitar una licencia médica?',
  },
  {
    keywords: ['espalda', 'lumbar', 'columna', 'dorsal', 'cervical', 'nuca', 'cuello'],
    response: '**Dolor de espalda**\n\nMuy común en trabajos domésticos por esfuerzo físico y posturas prolongadas.\n\n**Recomendaciones:**\n1. Evita cargar objetos pesados (pide ayuda)\n2. Al limpiar el piso, usa trapeador con mango largo\n3. Realiza estiramientos cada 2 horas\n4. Aplica calor local 15-20 minutos\n5. Toma ibuprofeno (400mg cada 8h con comida) si el dolor es moderado\n6. Mantén actividad suave, evita reposo prolongado\n\n⚠️ **Consulta de urgencia si:**\n• Pérdida de fuerza en piernas\n• Dificultad para orinar\n• Dolor que baja por la pierna (ciática intensa)\n• Fiebre asociada\n\nComo trabajadora de casa particular, tienes derecho a licencia médica si el dolor te impide trabajar.',
  },
  {
    keywords: ['fiebre', 'temperatura', 'calentura'],
    response: '**Fiebre**\n\nTemperatura >37.8°C oral o >38.2°C rectal.\n\n**Causas comunes:** Infecciones respiratorias, urinarias, gastrointestinales.\n\n**Qué hacer:**\n1. Tomar paracetamol (500-1000mg cada 6-8h)\n2. Hidratarse abundantemente\n3. Ropa liviana, ambiente fresco\n4. Reposo\n\n⚠️ **Consulta de urgencia si:**\n• Fiebre >39.5°C que no baja con paracetamol\n• Rigidez de nuca\n• Manchas en la piel (petequias)\n• Confusión mental\n• Dificultad para respirar\n• Fiebre por más de 3 días\n\nAvisa a tu empleador vía Poppins y solicita permiso médico.',
  },
  {
    keywords: ['estómago', 'abdominal', 'abdomen', 'barriga', 'panza', 'tripa', 'gastritis', 'indigestión'],
    response: '**Dolor abdominal**\n\n**Causas comunes:** Gastritis, indigestión, gases, infección intestinal.\n\n**Recomendaciones:**\n1. Dieta blanda (arroz, pollo, pan tostado)\n2. Evitar alimentos irritantes (café, condimentos, grasas)\n3. Tomar antiácido si hay ardor\n4. Hidratarse con suero oral si hay diarrea\n\n⚠️ **Consulta de URGENCIA si:**\n• Dolor intenso y súbito\n• Abdomen duro y distendido\n• Vómitos con sangre o heces negras\n• Fiebre alta + dolor severo\n• Dolor que se irradia al hombro\n\n⚠️ En mujeres: descartar embarazo ectópico si hay atraso menstrual + dolor pélvico.',
  },
  {
    keywords: ['diarrea', 'deposiciones', 'líquidas', 'sueltas'],
    response: '**Diarrea**\n\n**Causas comunes:** Gastroenteritis viral, intoxicación alimentaria, medicamentos.\n\n**Tratamiento:**\n1. Sales de rehidratación oral (SRO) o agua con limón, sal y azúcar\n2. Dieta BRAT (banano, arroz, manzana, tostadas)\n3. Evitar lácteos y grasas por 24-48h\n4. Loperamida (Imodium) solo si NO hay fiebre ni sangre\n\n⚠️ **Consulta si:**\n• Sangre o pus en las deposiciones\n• Fiebre >38.5°C\n• Deshidratación (boca seca, mareos, poca orina)\n• Dura más de 3 días\n• En niños pequeños: consultar siempre',
  },
  {
    keywords: ['vómito', 'vomitar', 'náusea', 'asco', 'mareo'],
    response: '**Náuseas y vómitos**\n\n**Causas comunes:** Gastroenteritis, intoxicación alimentaria, migraña, embarazo, mareo por movimiento.\n\n**Qué hacer:**\n1. Reposo, posición semisentada\n2. Sorbos pequeños de líquido frío (agua, infusión de jengibre)\n3. No forzar comida, esperar a que cedan las náuseas\n4. Dieta blanda cuando tolere\n\n⚠️ **Consulta si:**\n• Vómitos con sangre ("posos de café")\n• No tolera líquidos por >12 horas\n• Dolor abdominal intenso\n• Signos de deshidratación',
  },
  {
    keywords: ['garganta', 'angina', 'faringitis', 'amígdala', 'tragar'],
    response: '**Dolor de garganta (Faringitis)**\n\n**Causas:** Viral (80%) o bacteriana (estreptococo).\n\n**Tratamiento:**\n1. Gárgaras con agua tibia y sal\n2. Paracetamol o ibuprofeno para el dolor\n3. Líquidos tibios (sopa, té con miel)\n4. Pastillas para la garganta\n\n⚠️ **Consulta si:**\n• Fiebre >38.5°C por más de 2 días\n• Exudado blanco en amígdalas\n• Dificultad para tragar saliva\n• Ganglios cervicales muy inflamados\n\nSi es estreptocócica, necesitarás antibióticos (amoxicilina) recetados por médico.',
  },
  {
    keywords: ['tos', 'toser', 'flema', 'expectoración'],
    response: '**Tos**\n\n**Tipos:** Seca (irritativa) o productiva (con flema).\n\n**Recomendaciones:**\n1. Hidratación abundante\n2. Miel con limón (adultos)\n3. Humidificar el ambiente\n4. Evitar irritantes (humo, polvo, productos de limpieza)\n\n⚠️ **Consulta si:**\n• Tos con sangre (hemoptisis)\n• Dificultad para respirar\n• Fiebre persistente\n• Tos >3 semanas\n• Pérdida de peso\n\n💡 Como trabajadora doméstica, usar mascarilla al limpiar con productos químicos puede prevenir tos irritativa.',
  },
  {
    keywords: ['respirar', 'ahogo', 'disnea', 'falta de aire', 'asfixia'],
    response: '**Dificultad para respirar (Disnea)**\n\n⚠️ **PUEDE SER URGENCIA MÉDICA**\n\n**Causas comunes:** Asma, infección respiratoria, ansiedad. Graves: embolia pulmonar, infarto.\n\n**Acción inmediata:**\n1. Sentarse erguida\n2. Aflojar ropa\n3. Respirar lento por la nariz\n4. Si tiene inhalador (asma), usarlo\n\n🚨 **Llama al 131 si:**\n• Labios o dedos azulados\n• No puede hablar frases completas\n• Dolor en el pecho\n• Se desmaya\n• Empeora rápidamente\n\nNO esperes, la disnea súbita requiere atención inmediata.',
  },
  {
    keywords: ['pecho', 'torácico', 'corazón', 'cardíaco', 'infarto', 'palpitaciones'],
    response: '**Dolor torácico / Palpitaciones**\n\n🚨 **POTENCIAL EMERGENCIA**\n\n**Causas:** Pueden ser musculoesqueléticas (benignas) o cardíacas (graves).\n\n**Acción inmediata:**\n1. Sentarse o acostarse\n2. Aflojar ropa\n3. Si tiene aspirina, masticar 1 tableta (500mg)\n\n🚨 **Llama al 131 INMEDIATAMENTE si:**\n• Dolor opresivo que irradia a brazo izquierdo o mandíbula\n• Sudoración fría\n• Dificultad para respirar\n• Náuseas con dolor de pecho\n• Pulso muy rápido o irregular\n\nLas palpitaciones aisladas suelen ser benignas (estrés, café), pero si son frecuentes consulta cardiólogo.',
  },
  {
    keywords: ['alergia', 'alérgica', 'urticaria', 'ronchas', 'picazón', 'hinchazón'],
    response: '**Alergias / Urticaria**\n\n**Causas comunes:** Alimentos, medicamentos, productos de limpieza, picaduras, polvo.\n\n**Tratamiento:**\n1. Antihistamínico oral (loratadina 10mg o cetirizina 10mg)\n2. Compresas frías en zonas afectadas\n3. Evitar rascarse\n4. Identificar y evitar el alérgeno\n\n🚨 **EMERGENCIA - Llama al 131 si:**\n• Hinchazón de labios, lengua o garganta\n• Dificultad para respirar\n• Mareo o desmayo\n• Estos son signos de ANAFILAXIA\n\n💡 Usa guantes al manipular productos de limpieza. Si tienes alergia conocida, informa a tu empleador.',
  },
  {
    keywords: ['quemadura', 'quemé', 'aceite', 'agua caliente', 'plancha'],
    response: '**Quemaduras (comunes en trabajo doméstico)**\n\n**Primeros auxilios:**\n1. Enfriar con agua corriente fría 10-20 minutos (NO hielo)\n2. NO aplicar pasta de dientes, mantequilla ni remedios caseros\n3. Cubrir con gasa estéril sin apretar\n4. Tomar paracetamol para el dolor\n\n⚠️ **Consulta de urgencia si:**\n• Quemadura en cara, manos, genitales o articulaciones\n• Ampolla grande (>5cm)\n• Piel blanca o carbonizada (3° grado)\n• Quemadura eléctrica o química\n• Afecta más del 10% del cuerpo\n\n💡 Prevención: usar guantes al planchar, mantener mangos de sartenes hacia adentro.',
  },
  {
    keywords: ['corte', 'herida', 'sangre', 'sangrando', 'cortadura'],
    response: '**Cortes y heridas**\n\n**Primeros auxilios:**\n1. Lavar con agua y jabón\n2. Presionar con gasa limpia 10-15 minutos\n3. Aplicar antiséptico (povidona yodada)\n4. Cubrir con apósito\n\n⚠️ **Consulta si:**\n• Sangrado que no para en 15 minutos\n• Herida profunda o bordes separados (necesita sutura)\n• Herida sucia o con objeto incrustado\n• Último refuerzo de tétanos hace >10 años\n• Signos de infección (enrojecimiento, pus, fiebre)',
  },
  {
    keywords: ['embarazo', 'embarazada', 'prenatal', 'postnatal', 'maternidad'],
    response: '**Embarazo y Maternidad (Derechos TCP)**\n\nComo trabajadora de casa particular tienes:\n\n**Licencias:**\n• Pre-natal: 6 semanas (42 días) antes del parto\n• Post-natal: 12 semanas (84 días) después\n• Post-natal parental: 12 semanas adicionales (o 18 a media jornada)\n• Permiso paternidad (padre): 5 días\n\n**Fuero maternal:** No pueden despedirte desde el embarazo hasta 1 año después del postnatal.\n\n**Subsidio:** Tu sueldo es cubierto por FONASA/ISAPRE durante la licencia.\n\n⚠️ **Consulta de urgencia si:**\n• Sangrado vaginal\n• Dolor abdominal intenso\n• Pérdida de líquido\n• Fiebre\n• Disminución de movimientos fetales',
  },
  {
    keywords: ['licencia', 'licencia médica', 'baja', 'reposo'],
    response: '**Licencia Médica**\n\nComo trabajadora de casa particular (TCP) tienes derecho a licencia médica:\n\n**Proceso:**\n1. Acude a tu centro de salud (CESFAM o particular)\n2. El médico emite licencia electrónica (LME)\n3. Se notifica automáticamente a tu empleador\n4. Tu sueldo es cubierto por FONASA (subsidio de incapacidad laboral)\n\n**Importante:**\n• No necesitas permiso del empleador para ir al médico\n• El empleador NO puede descontarte los días de licencia\n• Si estás en FONASA, el subsidio es el 100% del sueldo los primeros 3 días\n\n¿Quieres que solicite un permiso médico a tu empleador por Poppins?',
  },
  {
    keywords: ['centro', 'hospital', 'clínica', 'consultorio', 'cesfam', 'urgencia'],
    response: '**Centros de salud cercanos (Las Condes)**\n\n🏥 **CESFAM Carol Urzúa**\nAv. Las Condes 9500\nTel: 2 2345 6789\n\n🏥 **Clínica Las Condes**\nEstoril 450\nTel: 2 2210 4000\n\n🏥 **Hospital del Trabajador (ACHS)**\nRamón Carnicer 185, Providencia\nTel: 600 620 2000\n→ Accidentes laborales\n\n🏥 **SAPU (Urgencia nocturna)**\nConsulta en tu CESFAM horarios\n\n📞 **Emergencias: 131**\n\nRecuerda: como TCP tienes derecho a FONASA. Si sufriste un accidente de trabajo, acude al Hospital del Trabajador (ISL/ACHS).',
  },
  {
    keywords: ['medicamento', 'remedio', 'pastilla', 'dosis', 'farmacia'],
    response: '**Medicamentos**\n\n**Analgésicos comunes (sin receta):**\n• Paracetamol: 500-1000mg cada 6-8h (máx 4g/día)\n• Ibuprofeno: 400mg cada 8h con comida (máx 1200mg/día)\n• Aspirina: 500mg cada 8h (no en <18 años)\n\n**Importante:**\n• No mezcles paracetamol con ibuprofeno sin indicación\n• Ibuprofeno NO en ayunas (daña el estómago)\n• NO tomes antibióticos sin receta médica\n• Retira medicamentos con receta en farmacias con convenio FONASA\n\n⚠️ Avisa siempre al médico si tomas otros medicamentos para evitar interacciones.\n\n¿Necesitas configurar recordatorios de medicamentos en Poppins?',
  },
  {
    keywords: ['estrés', 'ansiedad', 'angustia', 'nerviosa', 'nervios', 'llorar', 'depresión', 'triste'],
    response: '**Salud Mental**\n\nEl estrés y la ansiedad son comunes. No estás sola.\n\n**Qué puedes hacer:**\n1. Habla con alguien de confianza\n2. Respira profundo: 4 segundos inhalar, 4 sostener, 4 exhalar\n3. Camina al aire libre 15-20 minutos\n4. Duerme suficiente (7-8 horas)\n5. Limita café y pantallas antes de dormir\n\n**Recursos de ayuda:**\n📞 Salud Responde: 600 360 7777 (24/7, gratuito)\n📞 Línea de la Vida: 600 360 7700\n📞 Fono Mujer: 1455 (violencia de género)\n\n⚠️ **Busca ayuda profesional si:**\n• Pensamientos de hacerte daño\n• No puedes dormir ni comer hace días\n• Llanto constante sin motivo\n• No puedes levantarte ni trabajar\n\nTienes derecho a licencia médica por salud mental.',
  },
  {
    keywords: ['caída', 'caí', 'golpe', 'tropecé', 'resbalé', 'accidente trabajo'],
    response: '**Caídas y accidentes de trabajo**\n\n**Primeros auxilios:**\n1. No mover si hay sospecha de fractura\n2. Aplicar hielo envuelto en paño 15-20 min\n3. Elevar la zona afectada\n4. Tomar analgésico si hay dolor\n\n⚠️ **Consulta si:**\n• No puedes mover la extremidad\n• Deformidad visible\n• Dolor intenso que no cede\n• Golpe en la cabeza con mareo o vómitos\n\n🏥 **Si fue ACCIDENTE DE TRABAJO:**\nAcude al Hospital del Trabajador o mutual (ISL)\nTel: 600 620 2000\n→ Cobertura completa por Ley 16.744\n→ Tu empleador debe reportar el DIAT en 24 horas\n→ No uses tu FONASA, usa el seguro laboral',
  },
];

function getAIResponse(userInput: string): string {
  const input = userInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const entry of medicalKnowledge) {
    for (const keyword of entry.keywords) {
      const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (input.includes(normalizedKeyword)) {
        return entry.response;
      }
    }
  }

  return 'Entiendo tu consulta. Para una orientación más precisa, necesito más detalles sobre tus síntomas.\n\nPuedes preguntarme sobre:\n• Dolores específicos (cabeza, espalda, estómago, pecho)\n• Fiebre, tos, diarrea, vómitos\n• Alergias, quemaduras, cortes\n• Licencia médica y centros de salud\n• Embarazo y maternidad\n• Estrés y salud mental\n• Accidentes de trabajo\n\n⚠️ En caso de emergencia, llama al 131.\n\n¿En qué puedo ayudarte?';
}

export default function AyudaMedicaPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getAIResponse(text.trim());
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <HeartPulse className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Ayuda Médica</h1>
            <p className="text-sm text-zinc-500">
              Asistente de salud con inteligencia artificial
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Este asistente no reemplaza la consulta médica profesional. En caso de emergencia,
            llame al <span className="font-bold">131</span>.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 pb-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => sendMessage(action.label)}
                disabled={isTyping}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors disabled:opacity-50 ${action.bgColor}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${action.color}`} />
                <span className="text-zinc-700">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'assistant'
                  ? 'bg-emerald-100'
                  : 'bg-zinc-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Bot className="h-4 w-4 text-emerald-600" />
              ) : (
                <User className="h-4 w-4 text-zinc-600" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'assistant'
                  ? 'bg-white border border-zinc-200 text-zinc-800'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
              <p
                className={`mt-1 text-[10px] ${
                  msg.role === 'assistant' ? 'text-zinc-400' : 'text-emerald-200'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Bot className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="shrink-0 pt-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta de salud..."
            disabled={isTyping}
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Emergency banner */}
      <div className="shrink-0 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs font-semibold text-red-800">
            Emergencias: 131 (Ambulancia) · 132 (Bomberos) · 133 (Carabineros)
          </p>
        </div>
      </div>
    </div>
  );
}
