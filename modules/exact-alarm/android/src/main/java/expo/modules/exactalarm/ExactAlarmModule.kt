package expo.modules.exactalarm

import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 안드로이드 "정확한 알람" 권한 확인과 설정 열기.
 *
 * 안드로이드 12(S)부터 이 권한이 없으면 OS가 알람을 미뤘다가 한꺼번에 보낸다.
 * 14부터는 기본으로 꺼져 있어서 사용자가 "알람 및 리마인더"에서 켜야 한다.
 * expo-notifications에는 이걸 확인하는 함수가 없어서 직접 만든다.
 */
class ExactAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    // 12 미만은 권한 개념이 없어 항상 정확하게 울린다.
    Function("canSchedule") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val alarmManager = appContext.reactContext?.getSystemService(AlarmManager::class.java)
        ?: return@Function true
      alarmManager.canScheduleExactAlarms()
    }

    // 피또 한 앱의 "알람 및 리마인더" 화면으로 바로 보낸다.
    // 중간에 return@Function으로 빠져나가면 돌려줄 값의 타입이 Unit과 Any?로 갈려 컴파일이 안 된다(EAS 빌드에서 확인).
    // 조건 하나로 감싸 끝까지 내려가게 한다.
    Function("openSettings") {
      val context = appContext.reactContext
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && context != null) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }
  }
}
