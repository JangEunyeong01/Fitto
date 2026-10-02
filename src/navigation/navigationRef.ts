import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * 화면 밖(알림을 눌렀을 때)에서 화면을 옮기기 위한 참조. App의 NavigationContainer에 붙인다.
 * 화면 안에서는 지금처럼 useNavigation을 쓴다.
 */
export const navigationRef = createNavigationContainerRef<any>();
