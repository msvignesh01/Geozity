import { useEffect, useRef, useState } from "react";
import { recordingToWav } from "../voice";
import type { VoiceProvider } from "../domain/voice";

export async function apiError(response: Response): Promise<Error> {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data &&
      "message" in data &&
      typeof data.message === "string"
    )
      return new Error(data.message);
  } catch {
    /* The HTTP status still gives a safe actionable error for non-JSON replies. */
  }
  return new Error(
    "The service could not complete the request. Please try again.",
  );
}
export function Voice({
  provider,
  onTranscript,
  onError,
}: {
  provider: VoiceProvider;
  onTranscript: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [consented, setConsented] = useState(false);
  const [state, setState] = useState<
    "idle" | "permission" | "recording" | "transcribing"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  function stopTracks() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }
  function cancel() {
    generation.current += 1;
    request.current?.abort();
    request.current = null;
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    recorder.current = null;
    stopTracks();
    setState("idle");
  }
  useEffect(
    () => () => {
      generation.current += 1;
      request.current?.abort();
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stopTracks();
    },
    [],
  );
  async function start() {
    const current = ++generation.current;
    setState("permission");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Voice recording is unavailable in this browser. Please type your question.",
        );
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation.current !== current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const instance = new MediaRecorder(media);
      recorder.current = instance;
      const chunks: BlobPart[] = [];
      instance.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      instance.onerror = () => {
        cancel();
        onError(
          "The microphone stopped unexpectedly. Please type or try again.",
        );
      };
      instance.onstop = async () => {
        stopTracks();
        if (generation.current !== current) return;
        setState("transcribing");
        const controller = new AbortController();
        request.current = controller;
        try {
          const wav = await recordingToWav(
            new Blob(chunks, { type: instance.mimeType }),
          );
          if (generation.current !== current) return;
          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": "audio/wav",
              "X-Voice-Provider": provider,
            },
            body: wav,
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(20000),
            ]),
          });
          if (!response.ok) throw await apiError(response);
          const data: unknown = await response.json();
          if (
            typeof data !== "object" ||
            !data ||
            !("text" in data) ||
            typeof data.text !== "string" ||
            data.text.length > 500
          )
            throw new Error("The transcript was unreadable. Please try again.");
          if (generation.current === current) onTranscript(data.text);
        } catch (error) {
          if (generation.current === current)
            onError(
              error instanceof Error
                ? error.message
                : "Transcription failed. Please type your question.",
            );
        } finally {
          if (generation.current === current) {
            setState("idle");
            request.current = null;
          }
        }
      };
      instance.start();
      setSeconds(0);
      setState("recording");
      const began = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - began) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 29 && instance.state === "recording") instance.stop();
      }, 250);
    } catch (error) {
      stopTracks();
      if (generation.current !== current) return;
      setState("idle");
      onError(
        error instanceof Error && error.name !== "NotAllowedError"
          ? error.message
          : "Microphone access was denied. You can still type your question.",
      );
    }
  }
  return (
    <div className="voice-controls">
      <label className="voice-consent">
        <input
          type="checkbox"
          checked={consented}
          disabled={state !== "idle"}
          onChange={(e) => setConsented(e.target.checked)}
        />
        Use {provider === "sarvam" ? "Sarvam" : "ElevenLabs"} for voice. Audio
        goes to this service under its{" "}
        <a
          href={
            provider === "sarvam"
              ? "https://www.sarvam.ai/privacy-policy"
              : "https://elevenlabs.io/privacy-policy"
          }
          target="_blank"
          rel="noreferrer"
        >
          privacy policy
        </a>
        . Geozity does not save recordings.
      </label>
      <div className="voice-actions">
        <button
          type="button"
          disabled={
            !consented || state === "permission" || state === "transcribing"
          }
          onClick={() =>
            state === "recording" ? recorder.current?.stop() : void start()
          }
        >
          {state === "recording"
            ? `Stop recording · ${seconds}s`
            : state === "permission"
              ? "Waiting for microphone…"
              : state === "transcribing"
                ? "Transcribing…"
                : "Record question"}
        </button>
        {state !== "idle" && (
          <button type="button" onClick={cancel}>
            Cancel recording
          </button>
        )}
      </div>
      <span role="status">
        {state === "recording"
          ? "Microphone recording. Stops automatically before 30 seconds."
          : state === "transcribing"
            ? "Converting your recording into editable text."
            : provider === "sarvam"
              ? "Indian and mixed speech becomes editable English text. Review before sending."
              : "Review the transcript before sending."}
      </span>
    </div>
  );
}
