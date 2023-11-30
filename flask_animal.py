from flask import Flask, request, jsonify ,Response
# from threading import Lock
# import threading
import os
import time
from flask_socketio import SocketIO, emit
import cv2
import signal
import eventlet
from eventlet import wsgi
import base64

import numpy as np
from stagcn import STA_GCN
from ultralytics import YOLO
import torch
from datetime import datetime

app = Flask(__name__)
# thread_lock = Lock()
processing = False
Queue = []
global socketio
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")
videoTimePath = "./videoTime.txt"
noEatTXT = ",/time_no_eat.txt"
eatTXT = "./time_eat.txt"

################################ Yolo ################################

global device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')



global action_dict
action_dict = action_dict = {0: 'lying', 1: 'turn', 2: 'sit', 3: 'bodydown', 4: 'walk', 5: 'potty', 6: 'eat'}


global count_dict
count_dict = {v: 0 for k, v in action_dict.items()}



global yolo
yolo = YOLO('82best.pt')



global stagcn_model
stagcn_model = STA_GCN(num_classes=7,
                           in_channels=2,
                           t_kernel_size=3,
                           hop_size=2,
                           num_att_edge=2).to(device)

stagcn_model.load_state_dict(torch.load('weight_1.pt'))
stagcn_model.eval()

print("6")
global video_path
video_path = "./video.mp4"

print("7")
global i
i = 0

global cap
global frameCount

global stop
stop = False

global lunchTime
lunchTime = []

global eatLunch
eatLunch =False

global eat_flag
eat_flag = False
############################## init #######################################
yoloWarmupStartTime = time.time()
print("warm up yolo")
yolo.predict("warmup.mp4")
yoloWarmupTime = time.time() - yoloWarmupStartTime
print("warm up end " + str(yoloWarmupTime))


###############################Function#####################################3



def read_file_to_array(filename):
    data_array = []  # 결과를 저장할 2차원 배열

    with open(filename, 'r') as file:
        for line in file:
            line = line.strip()  # 줄 바꿈 문자 제거
            if line:  # 빈 줄은 무시
                # parts = line.split()  # 공백으로 분리
                data_array.append(line)
                # if len(parts) >= 2:  # 최소한 텍스트와 시간 데이터가 있어야 함
                #     text = parts[0]
                #     time = parts[1]
    return data_array




def send_frame_and_data(frame, data):
    # socketio.emit('frame_and_data', {'frame': frame, 'data': data})
    socketio.emit('frame', {'frame': frame})


def process_video(video_path, txt_path):
    print("start process video")
    print("")

    file = None
    if txt_path is not None:
        file = read_file_to_array(txt_path)

    # print(file)

    # videoTimeArray = read_file_to_array(filename=videoTimePath)


    # yolo start
    global yolo
    yolo
    pre_gen = yolo.predict(video_path, stream=True, verbose=False)

    global stop

    global socketio
    global count_dict

    global eatLunch
    eatLunch = False

    global lunchTime
    global stagcn_model

    global eat_flag

    frame_buffer = []
    action_list = []  # 60 프레임을 저장하는 버퍼
    con = []

    fh = 0
    ft = 0

    time_list = []
    frame_array = []

    distance = 0
    score = 0
    before = 0
    print(" eat_flag : " + str(eat_flag))

    if eat_flag:
        action_dict = {0: 'lying', 1: 'turn', 2: 'sit', 3: 'run', 4: 'walk', 5: 'bodydown', 6: 'potty', 7: 'eat'}
        stagcn_model = STA_GCN(num_classes=8,
                               in_channels=2,
                               t_kernel_size=3,
                               hop_size=2,
                               num_att_edge=2).to(device)
        stagcn_model.load_state_dict(torch.load('weight_2.pt'))  # cls = 8 , hop, att => 2 , 2 kernel = 3
    else:
        action_dict = {0: 'lying', 1: 'turn', 2: 'sit', 3: 'bodydown', 4: 'walk', 5: 'potty', 6: 'eat'}
        stagcn_model = STA_GCN(num_classes=7,
                               in_channels=2,
                               t_kernel_size=3,
                               hop_size=2,
                               num_att_edge=2).to(device)
        stagcn_model.load_state_dict(torch.load('weight_1.pt'))  # 219
    stagcn_model.eval()
    fps = int(cv2.VideoCapture(video_path).get(cv2.CAP_PROP_FPS))
    count_dict = {v: 0 for k, v in action_dict.items()}

    for i, frame in enumerate(pre_gen):
        if stop is True:
            stop = False
            return
        now = time
        height = frame.orig_shape[0]
        width = frame.orig_shape[1]

        ret, jpeg = cv2.imencode('.jpg', frame.plot())
        if not ret:
            break

        frame_bytes = jpeg.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n\r\n')

        if i % 2 == 0:
            if frame.boxes.conf.shape[0] and frame.boxes.conf[0] > 0.8:
                if len(frame_buffer) == 0:
                    fh = i
                frame_buffer.append(frame)

        if i - fh > 183:  # 3간격 60프레임이 지나도록 차지 않았으면 ( 6초 연속 detection 되지 않았으면 ) clear
            frame_buffer.clear()
            continue
        if len(frame_buffer) == 60:
            ft = i
            temp_tensor = frame_buffer[0].keypoints.data
            before = frame_buffer[0][0].boxes.xywhn[0][:2]
            for t in frame_buffer[1:]:
                temp_tensor = torch.cat((temp_tensor, temp_tensor[-1, :, :] * 0.8 + t[0].keypoints.data[:, :, :] * 0.2),
                                        dim=0)
                distance += (np.linalg.norm(before.cpu() - t.boxes.xywhn[0][:2].cpu()))  # 거리 추가
                before = t.boxes.xywhn[0][:2]
            temp_tensor = temp_tensor.permute(2, 0, 1)[:2, :, :]  # x , y 좌표만 활용
            temp_tensor[0] /= width
            temp_tensor[1] /= height

            with torch.no_grad():
                result = torch.argmax(stagcn_model(temp_tensor.unsqueeze(0))[1], axis=1)

                action = action_dict[result[0].item()]
                count_dict[action] += 1
                action_list.append(action)
                frame_buffer.clear()  # 버퍼 비우기
                print(
                    f"Time :{fh // fps // 60}분 {fh // fps % 60}초 : {ft // fps // 60}분 {ft // fps % 60}초 Action : {action} , distance = {distance}")

                socketio.start_background_task(socketio.emit('action', {'data': action}))
                print(lunchTime)
                if len(lunchTime) != 0 and file != None:
                    # print("s")
                    if not eatLunch:
                        # print(i)
                        print(file[i])
                        checkEatLunch(datetime.strptime(str(file[i]), "%H:%M:%S"), action)
                        # print("dog not eat!")
                distance = 0

    if len(lunchTime) != 0:
        if eatLunch:
            print("dog eat!")
        else:
            print("dog not eat")
            socketio.start_background_task(socketio.emit('alert'))



def checkEatLunch(nowTime, action):
    global lunchTime
    global eatLunch
    # print(lunchTime[0][0])
    startTime = lunchTime[0][0]
    endTime = lunchTime[0][1]
    # print(startTime)
    # print(endTime)
    # print(nowTime)
    # print((startTime <= nowTime <= endTime) )
    # print((action == "eat"))
    # print((startTime <= nowTime <= endTime) and (action == "eat"))
    # for startTime, endTime in lunchTime[0][0]:
    if (startTime <= nowTime <= endTime) and (action == "eat") :
        eatLunch = True
        return




# def checkVideoAndTextLength(videoframs, videoTimelength):
#     if videoframs == videoTimelength:
#         return True
#     return False

def generate_stream(video_path):
    # video_path = "video.mp4"  # Replace with your video file's path
    cap = cv2.VideoCapture(video_path)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        ret, jpeg = cv2.imencode('.jpg', frame)
        if not ret:
            break

        frame_bytes = jpeg.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n\r\n')



################################ REST API ############################3

@app.route("/", methods=['GET'])
def home():
    print("home")
    global device
    global yolo
    global stagcn_model

    deviceMessage = 'cuda' if torch.cuda.is_available() else 'cpu'
    print("running with " + deviceMessage)

    message = "run with " + deviceMessage + "and yolo warmup"
    return jsonify(message=message)


@app.route('/upload/video', methods=['POST'])
def upload_file():
    if 'video' not in request.files:
        return 'No file part', 400

    video_file = request.files['video']

    if video_file.filename == '':
        return 'No selected file', 400

    # thread_lock.aquire()

    global video_path

    video_path = os.path.join('./', video_file.filename)
    video_file.save(video_path)

    # thread_lock.release()
    # socketio.start_background_task(process_video)

    return 'File uploaded successfully', 200


@app.route('/upload/time', methods=['POST'])
def upload_time():
    json_data = request.get_json()
    # Process the received JSON data as needed
    for entry in json_data:
        start_hour = entry['startHour']
        start_minute = entry['startMinute']
        end_hour = entry['endHour']
        end_minute = entry['endMinute']
        print("start_hour :" + str(start_hour))
        print("start_minute :" + str(start_minute))
        print("end_hour :" + str(end_hour))
        print("end_minute " + str(end_minute))
        print("")

    return jsonify(message="Data received and processed")


@app.route('/videoinfo', methods=['GET'])
def get_frame_count():
    print(" get videoinfo")
    global frameCount
    print(frameCount)
    # return jsonify({"videoFrameCount": frameCount, "intervelTime": intervelTime})
    return jsonify({"videoFrameCount": frameCount})

@app.route('/stream')
def stream():
    return Response(process_video("video.mp4", None),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stream/eat')
def streamEat():
    global eat_flag
    eat_flag = True
    return Response(process_video("./video1.mp4", "time_eat.txt"),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stream/noeat')
def streamNoEat():
    global eat_flag
    eat_flag = False
    return Response(process_video("./video2.mp4", "time_no_eat.txt"),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stream/sitwalk')
def streamsitwalk():
    global eat_flag
    eat_flag = False
    return Response(process_video("./body_sit_walk.avi", None),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stream/turnpooty')
def streamturnpooty():
    global eat_flag
    eat_flag = False
    return Response(process_video("./turn_pooty.mp4", None),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/report')
def report():
    global count_dict
    temp = jsonify(count_dict)
    print(temp)
    return temp

@app.route('/eattime', methods=['POST'])
def pageLunchTime(): #{ {'startHour': '1','startMin': 0 , 'endHour' : 12, 'endMin': 20}}
    global lunchTime
    lubchTime = []



    input = request.get_json()
    for i in range(0, len(input)):
        nowTime = input[i]
        startHour = nowTime.get("startHour")
        startMin = nowTime.get("startMin")
        endHour = nowTime.get("endHour")
        endMin = nowTime.get("endMin")
        startTime = datetime.strptime(str(startHour)+":"+str(startMin)+":"+str("00"),"%H:%M:%S")
        endTime = datetime.strptime(str(endHour) + ":" + str(endMin) + ":" + str("00"),"%H:%M:%S")
        lunchTime.append([startTime,endTime])

    print(lubchTime)
    return "ok" ,200



# @app.route('upload/videotime', method=['POST'])
# def upload_video_time():

###########################SocketIO #####################################

@socketio.on('connect')
def handle_connect():
    print("connect")

@socketio.on("next")
def send_next_frame():
    print(next)
    global i
    global cap
    global frameCount
    global intervelTime
    print(frameCount)

    while i < frameCount:
        if i %100 ==0:
            print(i)
        ret, frame = cap.read()
        if not ret:
            return

        _, buffer = cv2.imencode('.jpg', frame)
        i += 1
        frame_data = base64.b64encode(buffer).decode('utf-8')
        socketio.emit('next', {'data': frame_data})
        socketio.sleep(0.033)
    i+=1

@socketio.on('disconnect')
def handle_disconnect():
    # socketio.
    print("disconnect")


if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)


