# Instalación del Agente de Telemetría (Spooler Interceptor) para Milenium

Este agente captura silenciosamente todo lo que Milenium imprime interceptando directamente la cola de impresión (Spooler) de Windows, y lo envía al servidor de FastOrder mediante Supabase para fines de diagnóstico y métricas. **Es 100% transparente para el software Milenium.**

## Requisitos
1. Computador cliente Windows 10/11 con la impresora física instalada y configurada.
2. Acceso a Internet.
3. **Privilegios de Administrador** (requeridos para leer los archivos `.SPL` de la cola de impresión).

---

## 💻 Paso 1: Instalar Python
1. Descarga Python 3.10+ desde la [página oficial](https://www.python.org/downloads/windows/).
2. **¡MUY IMPORTANTE!** Durante la instalación, marca la casilla que dice **"Add Python to PATH"**.
3. Abre PowerShell (o CMD) como Administrador y verifica la instalación:
   `python --version`

---

## 🐍 Paso 2: Preparar el Agente
Copia la carpeta entera `milenium-agent` (donde está este archivo) al disco `C:\` del cliente, de modo que quede en: `C:\milenium-agent`.

Abre PowerShell **como administrador** en esa carpeta y ejecuta:
```powershell
pip install -r requirements.txt
```

Abre el archivo **`config.ini`** con el Bloc de notas y configura:
1. Las URL y Keys por las reales de Supabase del proyecto FastOrder.
2. En `PrinterName`, pon el nombre exacto de la impresora en Windows (Ej: `POS-80` o `EPSON TM-T20II`).

---

## 🚀 Paso 3: Iniciar el agente al arranque de Windows
Puedes probar que funciona simplemente ejecutando `arrancar.bat` como Administrador. Se abrirá una ventana negra indicando "Monitoring Printer...".

Para que no estorbe (ni lo cierren por accidente) y corra con Windows con permisos elevados:

1. Es recomendable crear una **Tarea Programada** (Task Scheduler) en Windows que ejecute el archivo `arrancar.bat` o `inicio_invisible.vbs`.
2. Configura la tarea para que inicie **"Al iniciar sesión"** y asegúrate de marcar la casilla **"Ejecutar con los privilegios más altos"** (Run with highest privileges). Esto es crucial para que el script pueda leer de `C:\Windows\System32\spool\PRINTERS`.

¡Listo! Cada vez que el cliente imprima una factura física, el Windows Spooler creará un archivo temporal, el agente lo detectará, extraerá el texto, lo enviará a `milenium_telemetry` en la nube, y Windows limpiará la cola de forma natural.
