# GitHub Code Search Results

**Query:** `Gemini CLI D state uninterruptible sleep`
**Found:** 100 results, showing top 2
**Execution:** 4.3s

---

### 3. [coreboot/coreboot](https://github.com/coreboot/coreboot) ⭐ 2.6k

**Path:** `Documentation/acronyms.md`
**Language:** markdown | **Lines:** 47
**Link:** https://github.com/coreboot/coreboot/blob/0da04cf6754925d47ef98e402c9fdacd0a9babd7/Documentation/acronyms.md

```markdown
* BPDT - Boot Partition Description Table
* bps - Bits Per Second
* BS - coreboot: Boot State - coreboot's ramstage sequence are made up
  of boot states.  Each of these states can be hooked to run functions
  before the stat, during the state, or after the state is complete.
* BSF - Intel: [**Boot Specification File**](https://www.intel.com/content/dam/develop/external/us/en/documents/boot-setting-1-0-820293.pdf)
* BSP - BootStrap Processor - The initialization core of the main
  system processor.  This is the processor core that starts the boot
  process.
* BSS - [**Block Starting Symbol**](https://en.wikipedia.org/wiki/.bss)
* BT - [**Bluetooth**](https://en.wikipedia.org/wiki/Bluetooth)
* Bus - Initially a term for a number of connectors wired together in
  parallel, this is now used as a term for any hardware communication
  method.
* BWG - Intel: BIOS Writers Guide


## C
* C-states: ACPI Processor Idle states.
  [**C-States**](https://en.wikichip.org/wiki/acpi/c-states) C0-Cx: Each
  higher number saves more power, but takes longer to return to a fully
  running processor.
* C0 - ACPI Defined Processor Idle state: Active - CPU is running
* C1 - ACPI Defined Processor Idle state: Halt - Nothing currently
  running, but can start running again immediately
* C2 - ACPI Defined Processor Idle state: Stop-clock - core clocks off
* C3 - ACPI Defined Processor Idle state: Sleep - L1 & L2 caches may be
  saved to Last Level Cache (LLC), core powered down.
* C4+ - Processor Specific idle states
* CAR - [**Cache As RAM**](https://web.archive.org/web/20140818050214/https://www.coreboot.org/data/yhlu/cache_as_ram_lb_09142006.pdf)
* CBFS - coreboot filesystem
* CBMEM - coreboot Memory
* CBI - Google: [**CrOS Board Information**](https://chromium.googlesource.com/chromiumos/docs/+/HEAD/design_docs/cros_board_info.md)
* CDN - [**Content Delivery Network**](https://en.wikipedia.org/wiki/Content_delivery_network)
* CEM - PCIe: [**Card ElectroMechanical**](https://members.pcisig.com/wg/PCI-SIG/document/folder/839) specification
* CFL - [**Coffee Lake**](https://en.wikichip.org/wiki/intel/microarchitectures/coffee_lake)
* CHI - Coherent Hub Interface
* CID - [**Coverity ID**](https://en.wikipedia.org/wiki/Coverity)
* CIM - [**Common Information Model**](https://www.dmtf.org/standards/cim)
* CISC - [**Complex Instruction Set Computer**](https://en.wikipedia.org/wiki/Complex_instruction_set_computer)
// ... truncated ...
```

---

### 6. [google/talkback](https://github.com/google/talkback) ⭐ 493

**Path:** `talkback/src/main/java/com/google/android/accessibility/talkback/actor/ImageCaptioner.java`
**Language:** java | **Lines:** 89
**Link:** https://github.com/google/talkback/blob/26a27dc009d5b3605e744222541f045a3c24e038/talkback/src/main/java/com/google/android/accessibility/talkback/actor/ImageCaptioner.java

```java
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_IMAGE_DESCRIBE_PERFORM;
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_IMAGE_DESCRIBE_SUCCEED;
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_OCR_ABORT;
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_OCR_PERFORM;
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_OCR_PERFORM_FAIL;
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_OCR_PERFORM_SUCCEED;
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_OCR_PERFORM_SUCCEED_EMPTY;
import static com.google.android.accessibility.talkback.analytics.TalkBackAnalytics.IMAGE_CAPTION_EVENT_SCREENSHOT_FAILED;
import static com.google.android.accessibility.talkback.dynamicfeature.ModuleDownloadPrompter.Requester.MENU;
import static com.google.android.accessibility.talkback.imagecaption.CaptionRequest.INVALID_DURATION;
import static com.google.android.accessibility.talkback.imagecaption.ImageCaptionUtils.constructCaptionTextForAuto;
import static com.google.android.accessibility.talkback.imagecaption.ImageCaptionUtils.constructCaptionTextForManually;
import static com.google.android.accessibility.talkback.imagecaption.ImageCaptionUtils.getAutomaticImageCaptioningState;
import static com.google.android.accessibility.talkback.imagecaption.Request.ERROR_INSUFFICIENT_STORAGE;
import static com.google.android.accessibility.talkback.imagecaption.Request.ERROR_NETWORK_ERROR;
import static com.google.android.accessibility.talkback.utils.FocusIndicatorUtils.getTalkBackFocusStrokeWidth;
import static com.google.android.accessibility.utils.Performance.EVENT_ID_UNTRACKED;
import static com.google.android.accessibility.utils.caption.ImageCaptionStorage.ENABLE_CACHE_MECHANISM;
import static com.google.android.accessibility.utils.caption.ImageCaptionUtils.CaptionType.ICON_LABEL;
import static com.google.android.accessibility.utils.caption.ImageCaptionUtils.CaptionType.IMAGE_DESCRIPTION;
import static com.google.android.accessibility.utils.caption.ImageCaptionUtils.CaptionType.OCR;
import static com.google.android.accessibility.utils.output.FeedbackItem.FLAG_NO_DEVICE_SLEEP;
import static com.google.android.accessibility.utils.output.SpeechController.QUEUE_MODE_UNINTERRUPTIBLE_BY_NEW_SPEECH_CAN_IGNORE_INTERRUPTS;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.content.SharedPreferences.OnSharedPreferenceChangeListener;
import android.graphics.Bitmap;
import android.graphics.Bitmap.Config;
import android.graphics.Color;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityWindowInfo;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
// ... truncated ...
```

---
