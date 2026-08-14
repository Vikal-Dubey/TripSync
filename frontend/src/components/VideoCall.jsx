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

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }

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
      // Leave the call if the whole page unmounts while still connected
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
        <div className="card">
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        {!inCall ? (
            <button className="btn-primary text-sm" onClick={joinCall}>
            📹 Join planning call
            </button>
        ) : (
            <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                <VideoTile ref={localVideoRef} label={`${currentUserName} (you)`} muted />
                {Object.entries(remotePeers).map(([socketId, { stream, name }]) => (
                <RemoteTile key={socketId} stream={stream} label={name} />
                ))}
            </div>
            <div className="flex gap-2">
                <button className="btn-secondary text-sm" onClick={toggleMic}>
                {micOn ? "🎤 Mute" : "🔇 Unmute"}
                </button>
                <button className="btn-secondary text-sm" onClick={toggleCam}>
                {camOn ? "📷 Camera off" : "📷 Camera on"}
                </button>
                <button className="btn-secondary text-sm ml-auto text-red-600" onClick={leaveCall}>
                Leave call
                </button>
            </div>
            </>
        )}
        </div>
    );
}

const VideoTile = forwardRef(function VideoTile({ label, muted }, ref) {
  return (
    <div className="relative aspect-video bg-ink rounded-md overflow-hidden">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      <span className="absolute bottom-1 left-1 code-chip bg-black/50! text-white! text-xs">
        {label}
      </span>
    </div>
  );
});

function RemoteTile({ stream, label }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-video bg-ink rounded-md overflow-hidden">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <span className="absolute bottom-1 left-1 code-chip bg-black/50! text-white! text-xs">{label}</span>
    </div>
  );
}