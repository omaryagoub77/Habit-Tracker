// Example usage in React Native
import { NativeModules } from 'react-native';

// Schedule an alarm for 10 seconds from now
NativeModules.AlarmModule.schedule(Date.now() + 10000);

// You can also schedule alarms for specific times
const futureTime = new Date();
futureTime.setHours(futureTime.getHours() + 1); // 1 hour from now
NativeModules.AlarmModule.schedule(futureTime.getTime());

// To stop the alarm, you would need to implement a stop method in the native module
// This would typically be done by sending a broadcast to stop the service