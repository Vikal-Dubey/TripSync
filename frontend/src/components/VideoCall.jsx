import { forwardRef, useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

export default function VideoCall({ socket, tripId, currentUserName }) {
  const [inCall, setInCall] = useState(false);
  const [remotePeers, setRemotePeers] = useState({}); // socketId -> { stream, name }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peersRef = useRef({}); // socketId -> Peer instance

  function createPeer(socketId, initiator, name) {
    const peer = new Peer({ initiator, trickle: true, stream: localStreamRef.current });

    peer.on("signal", (signal) => {
      socket.emit("webrtc:signal", { to: socketId, signal });
    });
    peer.on("stream", (stream) => {
      setRemotePeers((prev) => ({ ...prev, [socketId]: { stream, name } }));
    });
    peer.on("close", () => cleanupPeer(socketId));
    peer.on("error", () => cleanupPeer(socketId));

    peersRef.current[socketId] = peer;
    return peer;
  }

  function cleanupPeer(socketId) {
    peersRef.current[socketId]?.destroy();
    delete peersRef.current[socketId];
    setRemotePeers((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }

  async function joinCall() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      socket.emit("call:join", tripId, ({ ok, error, existingPeers }) => {
        if (!ok) return setError(error ?? "Failed to join call");
        existingPeers.forEach((p) => createPeer(p.socketId, true, p.name));
        setInCall(true);
      });
    } catch {
      setError("Could not access camera/microphone — check browser permissions");
    }
  }

  function leaveCall() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.keys(peersRef.current).forEach(cleanupPeer);
    socket.emit("call:leave", tripId);
    setInCall(false);
    setRemotePeers({});
  }

  // eslint-disable-next-line no-unused-vars
  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }

  // eslint-disable-next-line no-unused-vars
  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  }

  useEffect(() => {
    function handlePeerJoined({ socketId, name }) {
      createPeer(socketId, false, name);
    }
    function handleSignal({ from, signal }) {
      peersRef.current[from]?.signal(signal);
    }
    function handlePeerLeft({ socketId }) {
      cleanupPeer(socketId);
    }

    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("webrtc:signal", handleSignal);
    socket.on("call:peer-left", handlePeerLeft);

    return () => {
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("webrtc:signal", handleSignal);
      socket.off("call:peer-left", handlePeerLeft);
      if (localStreamRef.current) leaveCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, tripId]);

  useEffect(() => {
    if (inCall && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [inCall]);

  return (
    <div className="card-static bg-surface border border-border-custom p-6 rounded-3xl">
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold mb-4">
          {error}
        </div>
      )}

      {!inCall ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-14 h-14 bg-teal-primary/10 rounded-full flex items-center justify-center mb-4 text-teal-primary text-xl">
            📞
          </div>
          <h4 className="heading text-base font-semibold text-ink">Planning call is ready</h4>
          <p className="text-xs text-slate-sec mt-1 mb-5 max-w-xs">
            Start a voice and video workspace planning session with other online planners of this trip.
          </p>
          <button className="btn-primary text-sm py-2.5! px-6!" onClick={joinCall}>
            Join Planning Session
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <VideoTile ref={localVideoRef} label={`${currentUserName} (you)`} muted micOn={micOn} camOn={camOn} />
            {Object.entries(remotePeers).map(([socketId, { stream, name }]) => (
              <RemoteTile key={socketId} stream={stream} label={name} />
            ))}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 border-t border-border-custom pt-4">
            <button
              className={`btn-secondary text-xs py-2! px-3.5! font-semibold ${!micOn ? "border-coral/40 text-coral bg-red-50/40 hover:bg-red-50" : ""}`}
              onClick={toggleMic}
            >
              {micOn ? (
                <>🎤 Mute Mic</>
              ) : (
                <>🔇 Unmute Mic</>
              )}
            </button>
            <button
              className={`btn-secondary text-xs py-2! px-3.5! font-semibold ${!camOn ? "border-coral/40 text-coral bg-red-50/40 hover:bg-red-50" : ""}`}
              onClick={toggleCam}
            >
              {camOn ? (
                <>📷 Disable Cam</>
              ) : (
                <>🎥 Enable Cam</>
              )}
            </button>
            <button
              className="btn-primary ml-auto text-xs py-2! px-4! bg-red-500 hover:bg-red-600"
              onClick={leaveCall}
            >
              Leave Session
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const VideoTile = forwardRef(function VideoTile({ label, muted, micOn, camOn }, ref) {
  return (
    <div className="relative aspect-video bg-ink rounded-2xl overflow-hidden border border-border-custom shadow-inner flex items-center justify-center group">
      {!camOn && (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-white text-3xl font-extrabold select-none">
          {label.slice(0, 1).toUpperCase()}
        </div>
      )}
      
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        style={{ transform: "scaleX(-1)" }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${camOn ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] font-bold bg-ink/70 text-white py-1 px-2.5 rounded-lg backdrop-blur">
          {label}
        </span>
        <span className="text-xs bg-ink/70 p-1 rounded-lg backdrop-blur">
          {micOn ? "🎤" : "🔇"}
        </span>
      </div>
    </div>
  );
});

function RemoteTile({ stream, label }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-video bg-ink rounded-2xl overflow-hidden border border-border-custom shadow-inner flex items-center justify-center group">
      <video ref={videoRef} autoPlay playsInline style={{ transform: "scaleX(-1)" }} className="w-full h-full object-cover" />
      <span className="absolute bottom-2.5 left-2.5 text-[10px] font-bold bg-ink/70 text-white py-1 px-2.5 rounded-lg backdrop-blur">
        {label}
      </span>
    </div>
  );
}