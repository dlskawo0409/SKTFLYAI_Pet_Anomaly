import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert ,ScrollView, } from 'react-native'; // Import Alert
import Video from "react-native-video";
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker'
import { TouchableOpacity } from 'react-native';

export default function App() {
  const [videoSource, setVideoSource] = useState(null);
  const [totalTimeEntries, setTotalTimeEntries] = useState([])
  const [startTimeEntries, setStartTimeEntries] = useState([]);
  const [endTimeEntries, setEndTimeEntries] = useState([]);
  const [selectedHour, setSelectedHour] = useState(0); // Initialize with a default value
  const [selectedMinute, setSelectedMinute] = useState(0); // Initialize with a default value

  const selectVideo = () => {
    const options = {
      mediaType: 'video',
      videoQuality: 'high',
      includeBase64: false,
      paused: true

    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        const selectedVideo = response.assets[0];
        setVideoSource(selectedVideo.uri);
      }
    });
  };

  const uploadFile = async () => {
    if (!videoSource) {
      Alert.alert("File not selected", "파일이 선택되지 않았습니다. 파일을 선택해주세요.");
      return; // Don't proceed further if videoSource is null
    }

    if (totalTimeEntries.length === 0) {
      Alert.alert("Times not selected", "시간이 선택되지 않았습니다. 시간을 추가해주세요.");
      return;
    }
    
    // Code for uploading the video goes here
    // You can add the necessary logic to upload the selected video
    try {
      const formData = new FormData();
      formData.append('video', {
        uri: videoSource,
        name: 'video.mp4',
        type: 'video/mp4'
      });

      // formData.append('totalTimeEntries', createJSONData);
      Alert.alert("start video upload")
      
      await axios.post('http://20.214.106.141:80/upload/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      Alert.alert("File uploaded successfully")

      console.log('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert("파일 업로드에 실패했습니다")
    }
  }



  const addtotalTimeEntry = () => {
    const newStartTimeEntry = {
      startHour: selectedHour,
      startMinute: selectedMinute,
    };
    const newEndTimeEntry = {
      endHour: selectedHour,
      endMinute: selectedMinute,
    };
    const newTotalTimeEntry = {
      start: newStartTimeEntry,
      end: newEndTimeEntry,
    };
    setTotalTimeEntries([...totalTimeEntries, newTotalTimeEntry]);
   
  };

  const createJSONData = () => {
    const jsonData = totalTimeEntries.map((entry) => {
      return {
        startHour: entry.startHour,
        startMin: entry.startMinute,
        endHour: entry.endHour,
        endMin: entry.endMinute,
      };
    });
    console.log(jsonData)
    console.log(JSON.stringify(jsonData))

    return JSON.stringify(jsonData);
  };

  const eattime = async () => {
    try {
      if (totalTimeEntries.length === 0) {
        Alert.alert("Times not selected", "시간이 선택되지 않았습니다. 시간을 추가해주세요.");
        return;
      }
      const json = createJSONData()
      console.log(json)
      const response = await axios.post('http://20.214.106.141:80/eattime', json,{
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('HTTP eattime successful');
      Alert.alert("http eattime 성공")
    } catch (error) {
      console.error('Error in HTTP eattime:', error);
      Alert.alert("http eattime 실패")
    }
  }

  const uploadFileAndTime = async () =>{
    console.log("upload start1")
    uploadFile()
    console.log("upload start2")
    uploadTime()
  }
  
  const uploadTime = async() =>{
    const jsonData = createJSONData();
    console.log(jsonData);
    try {
      const response = await axios.post('http://20.214.106.141:80/upload/time', jsonData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Data uploaded successfully');
    } catch (error) {
      console.error('Error uploading data:', error);
      Alert.alert("데이터 업로드에 실패했습니다");
    }
  }

  const removeTotalTimeEntry = (index) => {
    const updatedTotalTimeEntries = [...totalTimeEntries];
    updatedTotalTimeEntries.splice(index, 1);
    setTotalTimeEntries(updatedTotalTimeEntries);
  };

  


  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.eat}>[밥 먹는 시간]</Text>
        {totalTimeEntries.map((entry, index)=> 
        <View style={styles.timeEntry}   totalTimeEntry key={index}>
          <View style={styles.pickerContainer} key={`start-${index}`}>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerText}>시작 시간</Text>
              <Picker
              selectedValue={entry.startHour}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setTotalTimeEntries((prevEntries)=>
                prevEntries.map((prevEntry, i) =>
                i === index ? { ...prevEntry, startHour: itemValue } : prevEntry))}>
                  {Array.from({ length: 24 }).map((_, hour) => (
                  <Picker.Item 
                  style={styles.texte}
                  key={hour} label={`${hour}시`} value={hour}/>))}
              </Picker>
            </View>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerText}>시작 분</Text>
              <Picker
              selectedValue={entry.startMinute}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setTotalTimeEntries((prevEntries) =>
                prevEntries.map((prevEntry, i) =>
                i === index ? { ...prevEntry, startMinute: itemValue } : prevEntry))}>
                  {Array.from({ length: 60 }).map((_, minute) => (
                  <Picker.Item 
                  style={styles.texte}
                  key={minute} label={`${minute}분`} value={minute} />))}
              </Picker>
            </View>
          </View>

          <View style={styles.ad} totalTimeEntry key={index}>
            <View key={`end-${index}`}>
            <TouchableOpacity 
              style={styles.remove}
              onPress={() => removeTotalTimeEntry(index)}>
                <Text style={styles.deletet}>-----내역 지우기-----</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.pickerContainer} key={`end-${index}`}>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerText}>종료 시간</Text>
              <Picker
              selectedValue={entry.endHour}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setTotalTimeEntries((prevEntries)=>
                prevEntries.map((prevEntry, i) =>
                i === index ? { ...prevEntry, endHour: itemValue } : prevEntry))}>
                  {Array.from({ length: 24 }).map((_, hour) => (
                  <Picker.Item 
                  style={styles.texte}
                  key={hour} label={`${hour}시`} value={hour} />))}
              </Picker>
            </View>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerText}>종료 분</Text>
              <Picker
              selectedValue={entry.endMinute}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setTotalTimeEntries((prevEntries) =>
                prevEntries.map((prevEntry, i) =>
                i === index ? { ...prevEntry, endMinute: itemValue } : prevEntry))}>
                  {Array.from({ length: 60 }).map((_, minute) => (
                  <Picker.Item 
                  style={styles.texte}
                  key={minute} label={`${minute}분`} value={minute} />))}
              </Picker>
            </View>
          </View>
        </View>)}
      </ScrollView>
      {videoSource && (
      <Video
      source={{ uri: videoSource }}
      style={styles.videoShow}
      controls={true}
      resizeMode='contain'/>)}
      <View style={styles.row}>
        <TouchableOpacity style={styles.buttonContainer} onPress={addtotalTimeEntry}>
          <Text style={styles.buttonText}>밥 먹는 시간 추가</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonContainer} onPress={selectVideo}>
          <Text style={styles.buttonText}>영상 선택하기</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.buttonContainer} onPress={uploadFile}>
          <Text style={styles.buttonText}>영상 올리기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonContainer} onPress={eattime}>
          <Text style={styles.buttonText}>식사 시간 올리기</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll:{ //건들지 마셈
    flex:1 // 가중치
  },
  container: { //배경(건들지 마셈)
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center', // 중앙 정렬
    padding:10
  },
  timeEntry: { //시작 + 종료 + 내역 지우기 전체 컨테이너
    flex:1,
    marginTop: 20,
    borderRadius: 20,
    width: 372,
    height: 320,
    right: 1,
    backgroundColor: '#e9e3f6'
  },
  eat: { //처음 밥 먹는 시간 텍스트
    width: 200,
    left: 10,
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 13,
    marginBottom: -4,
    color: "#444444"
  },
  videoShow: { //비디오
    flex: 0.4,
    width: 270,
    height: 120,
    alignItems: 'center',
    left: 50,
  },
  row: { //시간 영상 추가 버튼 contain
    flexDirection: 'row',
    marginBottom: 5,
  },
  buttonContainer: { //각 버튼별
    flex: 1,
    margin: 5,
    backgroundColor: '#ded1ff',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: { //각 버튼별 텍스트
    fontSize: 13,
    fontWeight: 'bold',
    color: "#444444"
  },
  ad:{ //내역 지우기 전체 컨테이너
    marginTop: 5,
    marginBottom: 5,
    height: 30,
    width: 370,
    alignItems: "center",
    justifyContent: "center",
  },
  remove:{ //내역지우기 컨테이너
    paddingTop: 7,
    alignItems: 'center',
  },
  deletet: {
    color: "#444444"
  },
  pickerContainer:{ //시작 시간,분 컨테이너
    flexDirection: 'row',
    backgroundColor:"#c7b2ff",
    marginLeft: 2,
    marginRight:2,
    borderRadius:20,
    marginTop: 10,
    width: 359
  },
  pickerSection:{ //드롭다운
    flex: 1,
    marginLeft:15,
    marginRight:2,
    justifyContent: "center",
  },
  pickerText:{ //시작 시간,분 텍스트
    color: '#444444',
    marginTop :15,
    marginLeft:7,
    marginRight:10,
    marginBottom :5,
    height: 18,
    width: 65,
  },
  picker:{ //시작 시간,분 배경
    marginTop : 10,
    marginRight: 20,
    marginLeft:5,
    marginBottom: 20,
    backgroundColor:'#ded1ff',
  },
  texte: {
    color: "#444444",
    backgroundColor: "white"
  }


}); 