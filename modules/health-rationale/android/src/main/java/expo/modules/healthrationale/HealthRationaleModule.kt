package expo.modules.healthrationale

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 헬스 커넥트 권한 창에서 "개인정보처리방침"을 누르면 OS가 피또를 이 action으로 연다.
 * 플레이 심사는 이때 앱이 처리방침을 보여주기를 요구한다(react-native-health-connect 플러그인은 여는 길만 만든다).
 *
 * - 13 이하: ACTION_SHOW_PERMISSIONS_RATIONALE
 * - 14 이상: VIEW_PERMISSION_USAGE (플러그인이 만든 activity-alias)
 *
 * 권한 창은 피또 위에 떠 있어서 대부분 이미 켜진 앱으로 돌아온다(onNewIntent). 꺼진 상태면 실행 intent에 담겨 온다.
 */
class HealthRationaleModule : Module() {
  private var pending = false

  override fun definition() = ModuleDefinition {
    Name("HealthRationale")

    OnNewIntent { intent ->
      if (intent.action in ACTIONS) pending = true
    }

    // 한 번 읽으면 지운다. 앞으로 나올 때마다 처리방침이 다시 열리지 않게.
    Function("consume") {
      val launch = appContext.currentActivity?.intent
      val hit = pending || launch?.action in ACTIONS
      pending = false
      if (launch?.action in ACTIONS) launch?.action = null
      hit
    }
  }

  companion object {
    private val ACTIONS = setOf(
      "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
      "android.intent.action.VIEW_PERMISSION_USAGE",
    )
  }
}
