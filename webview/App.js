import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { WebView } from 'react-native-webview';
import socketIOClient from 'socket.io-client';
import { Pie } from 'react-native-pie';

const Stack = createStackNavigator();

const HomeScreen = ({ route, navigation }) => {
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [actionData, setActionData] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isWebViewVisible, setIsWebViewVisible] = useState(null);
  const scrollViewRef = useRef(null);

  if (!route.params) {
    return <ActivityIndicator />;
  }
  const { uri = "http://20.214.106.141:80/stream" } = route.params;

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [actionData]);

  const setupSocket = () => {
    const newSocket = socketIOClient('http://20.214.106.141:80');

    newSocket.on('connect', () => {
      console.log('Connected to socket server!');
    });

    newSocket.on('action', (data) => {
      console.log('Received frame and data:', data.data);
      setActionData((prevActionData) => [...prevActionData, data.data]);
      // if(uri === "http://20.214.106.141:80/stream/noeat" )
    });
    newSocket.on('alert', ()=>{
      console.log('dog not eat');
      Alert.alert('강아지가 밥을 안 먹었어요!!')
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server.');
      // 소켓 연결이 끊겼을 때 재연결을 시도합니다.
      
      setTimeout(() => {
        setupSocket(); // 새로운 소켓 인스턴스를 생성하여 재연결 시도
      }, 1000); // 예를 들어 1초 후에 재연결 시도
      // newSocket.disconnect()
    });

    setSocket(newSocket);
  };

  const toggleWebView = () => {
    if (isSocketConnected === true) {
      socket.disconnect(); // 기존 소켓 연결 닫기
      setIsSocketConnected(false);
    } else {
      if (socket !== null) {
        socket.disconnect(); // 기존 소켓 연결이 열려있다면 닫기
      }
      setupSocket(); // 새로운 소켓 연결 맺기
      setIsSocketConnected(true);
    }
  
    setWebViewVisible((prevVisible) => !prevVisible);
  };

  return (
    <View style={styles.contain}>
      <View style={styles.a}>
        <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
          <Text style={styles.menuButton}>
            🗃️
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.videio8}>
        {webViewVisible && (
          <WebView
            source={{ uri: uri }}
            style={styles.video1}
          />
        )}
      </View>
      <View style={styles.logview}>
        <ScrollView ref={scrollViewRef}>
          {actionData.map((item, index) => (
            <Text key={index} style={styles.logText}>{item}</Text>
          ))}
        </ScrollView>
      </View>
      <View style={styles.buttonView}>
        <TouchableOpacity onPress={toggleWebView} style={styles.button1}>
          <Text style={styles.buttonText}>toggleWebView</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MenuScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Report')}>
        <Text style={styles.buttonText1}>레포트</Text>
      </TouchableOpacity> */}
      {/* <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Hospital')}>
        <Text style={styles.buttonText1}>근처 병원보기</Text>
      </TouchableOpacity> */}

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home',{uri: "http://20.214.106.141:80/stream/eat"} )}>
        <Text style={styles.buttonText1}>test eat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home',{uri: "http://20.214.106.141:80/stream/noeat"} )}>
        <Text style={styles.buttonText1}>test noeat</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home',{uri: "http://20.214.106.141:80/stream/sitwalk"} )}>
        <Text style={styles.buttonText1}>test sitwalk</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home',{uri: "http://20.214.106.141:80/stream/turnpooty"} )}>
        <Text style={styles.buttonText1}>test turnpooty</Text>
      </TouchableOpacity>



    </View>
  );
};



const ReportPage = ({ navigation }) => {
  const [responseData, setResponseData] = useState(null); // Initialize with null
  const widthAndHeight = 250;
  const sliceColor = ['#fbd203', '#ffb300', '#ff9100', '#ff6c00', '#ff3c00', '#00aaff', '#00ff00'];

  const getReport = async () => {
    try {
      const response = await fetch('http://20.214.106.141:80/report');
      if (response.ok) {
        const Data = await response.json(); // JSON 데이터 파싱
        console.log(Data);
        setResponseData(Data);
        console.log('get Report');
      } else {
        console.error('Failed to fetch Report');
        Alert.alert('get Report 실패');
      }
    } catch (error) {
      console.error('Error in HTTP Report:', error);
      Alert.alert('get Report 실패');
    }
  };


  useEffect(() => {
    if (responseData) {
      const dataValues = Object.values(responseData);
      const total = dataValues.reduce((sum, value) => sum + value, 0);
      const calculatedSections = dataValues.map((value, index) => ({
        percentage: (value / total) * 100,
        color: sliceColor[index % sliceColor.length], // Use modulo to repeat colors if necessary
      }));
      setSections(calculatedSections);
    }
  }, [responseData]);

  const [sections, setSections] = useState([]); // Initialize with an empty array

  return (
    <View style={styles.container}>
      <Text>Pie Chart Example</Text>
      <View
        style={{
          paddingVertical: 15,
          flexDirection: 'row',
          width: 350,
          justifyContent: 'space-between',
        }}
      >
        <Pie
          radius={80}
          innerRadius={50}
          sections={sections}
          strokeCap={'butt'}
        />
      </View>
    </View>
  );
};





const HospitalPage = ({ navigation }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [animalHospitals, setAnimalHospitals] = useState([]);

  useEffect(() => {
    // 현재 위치 가져오기
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
      },
      error => console.error(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }, []);

  useEffect(() => {
    if (currentLocation) {
      // 위치 기반 서비스를 이용하여 동물 병원 검색
      const searchAnimalHospitals = async () => {
        try {
          const response = await fetch(
            `https://api.example.com/animal-hospitals?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`
          );
          const data = await response.json();
          setAnimalHospitals(data);
        } catch (error) {
          console.error(error);
        }
      };

      searchAnimalHospitals();
    }
  }, [currentLocation]);



  return (
    <View>
     <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: currentLocation ? currentLocation.latitude : 37.78825,
          longitude: currentLocation ? currentLocation.longitude : -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Location"
          />
        )}

        {animalHospitals.map(hospital => (
          <Marker
            key={hospital.id}
            coordinate={{
              latitude: hospital.latitude,
              longitude: hospital.longitude,
            }}
            title={hospital.name}
          />
        ))}
      </MapView>

      <Text>Nearby Animal Hospitals:</Text>
      <FlatList
        data={animalHospitals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text>
            Hospital Name: {item.name}, Distance: {item.distance} km
          </Text>
        )}
      />
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contain:{ //배경(바꾸지 마셈)
    flex: 1,
    backgroundColor: '#ece9f5'
  },
  a: {
    left: 340,
    marginTop: 20,
    fontWeight: '100',
  },
  b: {
    color: "grey",
  },
  buttonView: { //connect, next 버튼 두개 그룹화
    flex: 1,
    width: 200,
    height: 100,
    justifyContent: 'center',
    left: 100,
  },
  videio8:{ //서버에서 가져오는 비디오 output화면
    flex: 7,
    width: 300,
    left: 52
  },
  video1:{
    flex: 2,
    resizeMode: "contain",
    width: 300, 
  },
  addButton: {
    flex: 1,
  },
  container: {
    flex:1,
    marginTop: 30,
    left: 60
  },
  buttonText1: {
    textAlign: 'center',
    fontSize: 20,
    color:'gray'
  },
  button: {
    backgroundColor: '#ded1ff', //connect. next 버튼 배경
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    height: 50,
    width: 300,
    right: 10,
    marginTop : 15,
    paddingTop: 10
  },
  button1: {
    backgroundColor: '#ded1ff', //connect. next 버튼 배경
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    height: 40,
    width: 300,
    right: 45,
    marginTop : 17,
    paddingTop: 10,
  },
  buttonText: {
    color: '#444444', //connect, next 버튼 텍스트
    fontSize: 12,
    textAlign: 'center',
  },
  logview: {
    flex: 2,
    borderWidth: 2,
    borderColor: 'grey',
    width: 300,
    marginTop: 5,
    marginLeft: 54,
    borderRadius: 5,
    maxHeight: 100
  },
  chart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  chartTitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
  logText:{
    fontSize: 20,
    color: 'blue',       // 텍스트 색상
    fontWeight: 'bold',  // 글꼴 굵기
    textAlign: 'center', // 텍스트 정렬
    textDecorationLine: 'underline', // 밑줄
    fontStyle: 'italic', // 이탤릭 스타일
    
  },
  menuButton :{
    left:15,
    fontSize:35,
    marginTop: -15,
    marginBottom: 10
  },
  reportContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    width: 300,
    height: 300,
  },
  container: {
    flex: 1,
    backgroundColor: '#ece9f5',
    alignItems: "center"
  }
});

const App = () => {
  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }}initialParams={{ data: "http://20.214.106.141:80/stream" }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ headerStyle: { backgroundColor: '#ece9f5' }}} />
        <Stack.Screen name="Report" component={ReportPage} />
        <Stack.Screen name="Hospital" component={HospitalPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;