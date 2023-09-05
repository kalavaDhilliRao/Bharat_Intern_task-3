
const APP_ID = "4d13d496f51044a6aa43c2c1268a5653";
const TOKEN = "007eJxTYNi74Fjw78deh8T1q+Yc2rmPQ1fF+EpOm4xay9eqywe1iooVGExSDI1TTCzN0kwNDUxMEs0SE02Mk42SDY3MLBJNzUyNJx7/mtIQyMjg7mnCzMgAgSA+C0NuYmYeAwMAbr0fTQ=="; // Replace with your Agora token
const CHANNEL = "main";


const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });


let localTracks = [];
let remoteUsers = {};


const chatContainer = document.getElementById("chat-messages");


function sendMessage(message) {
  
  displayMessage("You", message);
}


function displayMessage(sender, message) {
  const messageElement = document.createElement("div");
  messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatContainer.appendChild(messageElement);
}

document.getElementById("send-btn").addEventListener("click", () => {
  const messageInput = document.getElementById("chat-input");
  const message = messageInput.value.trim();
  if (message !== "") {
    sendMessage(message);
    messageInput.value = "";
  }
});


async function joinAndDisplayLocalStream() {
  client.on('user-published', handleUserJoined);
  client.on('user-left', handleUserLeft);

  const UID = await client.join(APP_ID, CHANNEL, TOKEN, null);

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

  const player = `
    <div class="video-container" id="user-container-${UID}">
      <div class="video-player" id="user-${UID}"></div>
    </div>
  `;

  document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

  localTracks[1].play(`user-${UID}`);

  await client.publish([localTracks[0], localTracks[1]]);
}


async function handleUserJoined(user, mediaType) {
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    const playerContainer = document.getElementById(`user-container-${user.uid}`);
    
    if (playerContainer) {
      playerContainer.remove();
    }

    const player = `
      <div class="video-container" id="user-container-${user.uid}">
        <div class="video-player" id="user-${user.uid}"></div>
      </div>
    `;

    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    user.videoTrack.play(`user-${user.uid}`);
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }

  if (mediaType === "chat") {
    
    user.on("message", (text, senderId) => {
      displayMessage(`User ${senderId}`, text);
    });
  }
}


const handleUserLeft = (user) => {
  delete remoteUsers[user.uid];
  const userContainer = document.getElementById(`user-container-${user.uid}`);
  if (userContainer) {
    userContainer.remove();
  }
};


async function leaveAndRemoveLocalStream() {
  for (let i = 0; i < localTracks.length; i++) {
    localTracks[i].stop();
    localTracks[i].close();
  }

  await client.leave();

  document.getElementById('join-btn').style.display = 'block';
  document.getElementById('stream-controls').style.display = 'none';
  document.getElementById('video-streams').innerHTML = '';
}


async function toggleMic(e) {
  const isMuted = localTracks[0].muted;
  await localTracks[0].setMuted(!isMuted);
  e.target.innerText = isMuted ? 'Mic On' : 'Mic Off';
  e.target.style.backgroundColor = isMuted ? 'cadetblue' : '#EE4B2B';
}


async function toggleCamera(e) {
  const isMuted = localTracks[1].muted;
  await localTracks[1].setMuted(!isMuted);
  e.target.innerText = isMuted ? 'Camera On' : 'Camera Off';
  e.target.style.backgroundColor = isMuted ? 'cadetblue' : '#EE4B2B';
}


document.getElementById("join-btn").addEventListener("click", async () => {
    await joinAndDisplayLocalStream();
    document.getElementById("chat-container").style.display = "block";
    document.getElementById("record-btn").style.display = "block";
    document.getElementById("join-btn").style.display = "none";
    
    
    document.getElementById("stream-controls").style.display = "block";
    document.getElementById("video-streams").style.display = "block";
  });

let isRecording = false;
let mediaRecorder;

document.getElementById("record-btn").addEventListener("click", () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

function startRecording() {
  const videoStream = localTracks[1].stream;
  mediaRecorder = new MediaRecorder(videoStream);

  const recordedChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const recordedBlob = new Blob(recordedChunks, { type: "video/webm" });

    const videoUrl = URL.createObjectURL(recordedBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = videoUrl;
    downloadLink.download = "recorded-video.webm";
    downloadLink.textContent = "Download Recorded Video";
    document.getElementById("video-streams").appendChild(downloadLink);
  };

  mediaRecorder.start();
  isRecording = true;
  document.getElementById("record-btn").innerText = "Stop Recording";
}

function stopRecording() {
  mediaRecorder.stop();
  isRecording = false;
  document.getElementById("record-btn").innerText = "Start Recording";
}

document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
