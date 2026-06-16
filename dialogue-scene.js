// ═══════════════════════════════════════════════════
//  dialogue-scene.js  — 동료 스토리 대화 씬
//  호감도 30/50/75/100 달성 시 자동 트리거
// ═══════════════════════════════════════════════════
"use strict";

// ── 대화 데이터 ────────────────────────────────────
const DIALOGUE_DATA = {

  // ══════════════════════════════════════════════
  //  리온 (힐러)
  // ══════════════════════════════════════════════
  healer: {
    portrait: "images/portrait_healer.png",
    name: "리온",
    dialogues: {
      30: {
        title: "첫 신뢰",
        lines: [
          { speaker: "리온", text: "…이상하군요. 제 치유의 기적은 가문의 엄격한 규율과 신성한 의무 아래에서만 펼쳐지는 것이라 배웠습니다. 하지만 당신과 함께할 때면, 손끝의 마력이 제 의지보다 먼저 움직이곤 합니다." },
          { speaker: "주인공", text: "그건 의무가 아니라, 네 진심이 눈앞의 사람을 구하고 싶어 하기 때문 아닐까?" },
          { speaker: "리온", text: "진심, 인가요…. 가문이 아닌 오롯이 저 자신의 의지라니, 낯설군요. 하지만… 나쁘지 않은 감각입니다. 앞으로도 당신의 뒤는 제가 책임지죠. 너무 무리하지는 마십시오." },
        ]
      },
      50: {
        title: "전우",
        lines: [
          { speaker: "리온", text: "하아… 방금 전투는 정말 무모했습니다! 제 치유력이 아무리 강력하다 해도, 당신이 치명상을 입으면 저로서도 손쓸 도리가 없단 말입니다!" },
          { speaker: "주인공", text: "미안, 하지만 네가 내 뒤에 있다는 걸 믿었으니까 뛰어들 수 있었어." },
          { speaker: "리온", text: "…정말이지, 당신은 사람을 곤란하게 만드는 데 재주가 있군요. 그런 맹목적인 신뢰는 제게 과분합니다.", action: "당황하며 살짝 고개를 돌린다." },
          { speaker: "리온", text: "…하지만, 다음에도 당신이 뛰어든다면 기꺼이 그 발밑을 황금빛의 축복으로 가득 채워드리죠." },
        ]
      },
      75: {
        title: "사연",
        lines: [
          { speaker: "리온", text: "사실 저는… 완벽한 첫째 언니의 그늘에 가려진 존재였습니다. 고결한 가문의 이름을 빛내기 위해, 전장이라는 가장 참혹한 곳으로 보내진 '소모품'에 불과했죠. 이 지팡이를 쥐고 전장에 설 때마다, 제 존재 가치는 타인을 치유하는 것 외엔 없다고 생각했습니다." },
          { speaker: "주인공", text: "넌 가문의 도구가 아니야, 리온. 넌 이미 수많은 목숨을 구한, 우리에게 없어서는 안 될 소중한 존재야." },
          { speaker: "리온", text: "…언니도, 부모님도 제게 그런 말을 해준 적은 없었습니다. 다들 당연하게 여겼으니까요. 고맙습니다. 당신의 그 한마디가, 가문의 굴레에 갇혀 있던 저를 구원해 주었습니다." },
        ]
      },
      100: {
        title: "유대",
        lines: [
          { speaker: "리온", text: "이제야 깨달았습니다. 신께서 제게 이 거대한 빛의 힘을 주신 이유는, 가문의 명예를 높이기 위함이 아니었습니다. 바로 당신을 만나, 당신이 걸어가는 그 험난한 길을 끝까지 밝혀주기 위함이었음을요." },
          { speaker: "주인공", text: "앞으로 어떤 적이 나타나도, 네가 곁에 있다면 두렵지 않아." },
          { speaker: "리온", text: "네, 두려워하지 마십시오. 제 마력이 다하고 숨이 멎는 그 순간까지, 당신에게는 단 한 방울의 피도, 그 어떤 상처도 허락하지 않을 것입니다. …나의 소중한 전우여, 영원히 당신과 함께하겠습니다." },
        ]
      },
    }
  },

  // ══════════════════════════════════════════════
  //  카르나 (딜러)
  // ══════════════════════════════════════════════
  dealer: {
    portrait: "images/portrait_dealer.png",
    name: "카르나",
    dialogues: {
      30: {
        title: "첫 신뢰",
        lines: [
          { speaker: "카르나", text: "…당신의 지휘는 실로 놀랍더군요. 몰락해 가던 우리 가문의 검술이, 당신의 손을 거치니 비로소 전장에서 제 위력을 발휘하는 기분이 듭니다." },
          { speaker: "주인공", text: "난 그저 네가 가진 날카로운 검을 휘두를 수 있는 전장을 마련해 준 것뿐이야." },
          { speaker: "카르나", text: "날카로운 검이라… 과분한 칭찬이군요. 제 검은 가문의 무너진 명예를 다시 세우기 전까지 결코 무뎌져서는 안 되는 검입니다. 당신이 저를 올바른 곳으로 이끌어줄 수 있다면… 이 검을 기꺼이 당신에게 먼저 빌려드리겠습니다." },
        ]
      },
      50: {
        title: "전우",
        lines: [
          { speaker: "카르나", text: "하하하! 보셨습니까? 제 대검에서 뿜어져 나오는 붉은 뇌전이 적들의 진형을 송두리째 짓밟아버리는 모습을 말입니다! 가슴이 끓어오르는 전투였습니다!" },
          { speaker: "주인공", text: "정말 대단했어, 카르나. 하지만 가끔은 너무 무리하게 돌격하는 것 같아 걱정돼." },
          { speaker: "카르나", text: "…장자로서 가문을 일으켜야 한다는 조급함이 앞섰나 봅니다.", action: "웃음기를 거두고 진지하게." },
          { speaker: "카르나", text: "하지만 걱정 마십시오. 당신이라는 훌륭한 전우를 두고, 제가 전장에서 허망하게 꺾일 일은 없을 테니까요. 다음엔 속도를 맞추겠습니다." },
        ]
      },
      75: {
        title: "사연",
        lines: [
          { speaker: "카르나", text: "…가끔은 이 투구가 너무 무겁게 느껴집니다. 가문이 몰락한 날 이후, 제게는 '실패할 자유' 따위는 없었습니다. 동생들의 생계와 가문의 이름이 모두 제 검 끝에 걸려 있으니까요. 매일 밤, 내가 무너지면 모든 것이 끝난다는 악몽을 꿉니다." },
          { speaker: "주인공", text: "더 이상 혼자 그 무게를 다 짊어지려고 하지 마. 이제는 내가 함께 짊어져 줄 테니까." },
          { speaker: "카르나", text: "당신은… 참 묘한 사람입니다. 타인의 몰락에 왜 그렇게 깊이 관여하려 하시는지. 하지만, 그 다정한 오지랖이 오늘 밤은 제게 큰 위로가 되는군요. 고맙습니다. 처음으로 이 무거운 투구 속에서 숨을 쉴 수 있을 것 같습니다." },
        ]
      },
      100: {
        title: "유대",
        lines: [
          { speaker: "카르나", text: "처음에는 제 안위와 가문의 부흥만을 위해 당신을 따랐음을 고백합니다. 하지만 이제는 아닙니다. 제 검이 향하는 끝에는 가문의 영광보다, 당신의 안위와 승리가 먼저 자리 잡고 있습니다." },
          { speaker: "주인공", text: "나와 함께 가문을 일으키고, 새로운 전설을 써 내려가자." },
          { speaker: "카르나", text: "몰락한 기사 가문의 장자, 카르나. 이 자리에서 가문의 이름이 아닌, 제 영혼을 걸고 당신께 맹세합니다.", action: "한쪽 무릎을 꿇고 검을 땅에 박으며." },
          { speaker: "카르나", text: "대지를 가르는 이 붉은 번개는 오직 당신의 앞길을 가로막는 적들만을 불태울 것이며, 제 방패는 당신이 쓰러지는 것을 절대 용납하지 않을 것입니다. 나의 유일한 주군이시여, 당신의 검이 되겠습니다." },
        ]
      },
    }
  },

  // ══════════════════════════════════════════════
  //  아리아 (궁수)
  // ══════════════════════════════════════════════
  archer: {
    portrait: "images/portrait_archer.png",
    name: "아리아",
    dialogues: {
      30: {
        title: "첫 신뢰",
        lines: [
          { speaker: "아리아", text: "…솔직히 말해 인간들의 전술이란 잔재주에 불과하다고 생각했습니다. 하지만 당신의 지휘는 숲의 영리한 맹수처럼 거침없고 정확하더군요. 제 화살이 빗나가지 않은 건 당신의 길잡이 덕분입니다." },
          { speaker: "주인공", text: "네 실력이 워낙 뛰어난 덕분이지. 네 화살이 없었다면 돌파구를 찾지 못했을 거야." },
          { speaker: "아리아", text: "칭찬은 달콤하지만, 저는 가문을 대표해 온 몸입니다. 쉽게 들뜨지 않아요. …그래도, 당신의 판단력만큼은 신뢰해도 좋겠다는 생각이 드는군요. 다음 전투에서도 제 활시위는 당신이 가리키는 곳을 향할 것입니다." },
        ]
      },
      50: {
        title: "전우",
        lines: [
          { speaker: "아리아", text: "방금 사각지대에서 날아온 기습을 보셨나요? 눈빛 하나 흐트러뜨리지 않고 바람을 찢어 기어코 적의 심장을 꿰뚫었습니다! 제 호위를 받는 걸 영광으로 생각하시죠?" },
          { speaker: "주인공", text: "정말 완벽한 타이밍이었어. 역시 우리 가문의 대표 궁수님다워." },
          { speaker: "아리아", text: "갑자기 그런 진지한 얼굴로 가문을 들먹이다니 반칙입니다…. 흠, 흠!", action: "살짝 붉어진 얼굴로 흠칫하며." },
          { speaker: "아리아", text: "아무튼, 당신이 전장에서 등 뒤를 통째로 비워둘 만큼 나를 믿어주니 나도 모르게 손가락이 먼저 반응한 것뿐입니다. 계속 그렇게 절 믿고 전진하세요." },
        ]
      },
      75: {
        title: "사연",
        lines: [
          { speaker: "아리아", text: "사실… 저는 전임 대표였던 스승님에 비하면 턱없이 부족한 조무래기일 뿐입니다. 고결한 엘프 가문이 저를 이곳으로 보낸 건, 숲의 경계가 무너지기 직전이라 찬밥 더운밥 가릴 처지가 아니었기 때문이죠. 매번 화살을 먹일 때마다, 제 한 발에 숲의 존망이 걸려있다는 생각에 활을 쥔 손이 미세하게 떨리곤 했습니다." },
          { speaker: "주인공", text: "그런 부담감을 혼자 안고 있었구나. 하지만 지금 넌 누구보다 훌륭하게 가문과 숲을 지켜내고 있어. 그리고 여기선 나도 함께 싸우고 있잖아." },
          { speaker: "아리아", text: "…늘 고독하게 숲의 그림자 속에서 시위만 당기던 제게, '함께'라는 단어는 너무 가혹할 정도로 따뜻하네요. 고맙습니다. 당신 곁에 있을 때만큼은, 가문의 대표라는 무거운 짐을 잠시 내려놓고 온전한 '아리아'로 숨 쉴 수 있어요." },
        ]
      },
      100: {
        title: "유대",
        lines: [
          { speaker: "아리아", text: "엘프에게 있어 활을 건넨다는 것은, 자신의 영혼과 생명을 맡긴다는 뜻입니다. 처음엔 오직 가문과 세계수의 안녕을 위해 이 활을 잡았지만, 이제 제 화살이 가장 먼저 가닿는 곳은… 바로 당신이 있는 곳입니다." },
          { speaker: "주인공", text: "네 화살이 내 길을 밝혀주는 한, 난 그 어떤 어둠 속이라도 걸어갈 수 있어." },
          { speaker: "아리아", text: "바람이 속삭이는군요. 당신과 제 운명이 영원히 얽혔다고.", action: "미소를 지으며 숲의 축복이 담긴 마력 화살을 들어 올린다." },
          { speaker: "아리아", text: "약속할게요. 숲의 정령들과 가문의 이름, 그리고 제 모든 명예를 걸고… 당신의 앞길을 가로막는 모든 장벽을 제 화살로 꿰뚫어 흔적도 없이 날려버리겠습니다. 영원히 당신의 눈과 귀, 그리고 날카로운 창이 되어 곁을 지키겠어요." },
        ]
      },
    }
  },

  // ══════════════════════════════════════════════
  //  엘린 (마법사 동료)
  // ══════════════════════════════════════════════
  mage_party: {
    portrait: "images/portrait_mage_party.png",
    name: "엘린",
    dialogues: {
      30: {
        title: "첫 신뢰",
        lines: [
          { speaker: "엘린", text: "…인간의 수명은 찰나에 불과하거늘, 당신의 눈빛에는 그 짧은 시간을 뛰어넘는 기묘한 서사가 담겨 있군요. 내 오랜 권태를 깨운 건 당신이 처음입니다." },
          { speaker: "주인공", text: "내 눈에 뭐가 보이길래 그래? 난 그저 지금 눈앞의 전장에 집중할 뿐이야." },
          { speaker: "엘린", text: "그 우직함이 흥미롭다는 겁니다. 좋습니다, 마침 이 지루한 전장에 활력이 필요하던 참이었으니… 내 마법이 당신의 발걸음에 파멸이 아닌, 승리의 길을 열어주도록 하죠." },
        ]
      },
      50: {
        title: "전우",
        lines: [
          { speaker: "엘린", text: "하핫, 방금 내 보라색 마력이 공간을 찢어발기던 궤적을 보셨나요? 적들이 한 줌의 재로 변하는 그 순간 말입니다. 당신이 길을 터주지 않았다면 이런 짜릿한 마법은 완성되지 못했을 거예요." },
          { speaker: "주인공", text: "엄청난 마법이었어, 엘린. 하지만 네 마력이 폭주할까 봐 조금 조마조마했어." },
          { speaker: "엘린", text: "조마조마했다라…. 수백 년 만에 들어보는 신선한 걱정이군요. 걱정 마세요, 필멸자여. 난 이래 봬도 세상의 탄생과 몰락을 지켜본 몸이니까요. 당신이 내 곁에 있는 한, 이 마법은 오직 아군에게만 따스한 등불이 될 뿐입니다." },
        ]
      },
      75: {
        title: "사연",
        lines: [
          { speaker: "엘린", text: "…시간이 흐르고 흘러도 변하지 않는다는 건, 축복이 아니라 저주에 가깝습니다. 내가 사랑했던 이들, 나를 따랐던 제자들은 모두 흙으로 돌아갔지만 나는 여전히 이 모습 그대로 도서관의 먼지 낀 고서들을 뒤적이고 있었죠. 세상의 종말이 와도 상관없다고 생각했습니다. 당신을 만나기 전까지는요." },
          { speaker: "주인공", text: "그래서 그 긴 침묵을 깨고 우리를 도우러 와준 거야?" },
          { speaker: "엘린", text: "네. 역사의 수많은 페이지를 넘겨보았지만, 당신처럼 가슴을 뛰게 만드는 인물은 없었으니까요. 이번만큼은 관찰자가 아닌, 당신과 함께 이 이야기의 주인공이 되어 끝을 맺고 싶어졌습니다. 내 고독한 영원에 의미를 부여해 준 건, 바로 당신입니다." },
        ]
      },
      100: {
        title: "유대",
        lines: [
          { speaker: "엘린", text: "내 손끝에서 피어나는 이 보라색 번개는 이제 세상을 파괴하기 위함이 아닙니다. 당신이 이룰 세계, 당신이 걸어갈 그 위대한 역사를 영원히 보존하고 수호하기 위한 힘이죠." },
          { speaker: "주인공", text: "시간이 흘러 내가 늙고 지치더라도, 내 곁에 있어 줄래?" },
          { speaker: "엘린", text: "당연한 소리를 하시는군요.", action: "부드럽게 미소 지으며 주인공의 뺨에 손을 얹는다." },
          { speaker: "엘린", text: "당신의 육신이 먼지가 되어 사라질지라도, 당신의 영혼만큼은 내 마법으로 영원히 붙잡아 둘 겁니다. 내 삶의 마지막 장은 이미 당신으로 채워졌으니… 시공간이 뒤틀리는 그날까지, 영원히 당신과 궤적을 함께하겠습니다." },
        ]
      },
    }
  },

  // ══════════════════════════════════════════════
  //  카인 (탱커)
  // ══════════════════════════════════════════════
  tanker: {
    portrait: "images/portrait_tanker.png",
    name: "카인",
    dialogues: {
      30: {
        title: "첫 신뢰",
        lines: [
          { speaker: "카인", text: "…제 방패는 언제나 약자를 구하고 정의를 짓밟는 자들을 막기 위해 존재합니다. 하지만 전장에서 제 가치관을 온전히 빛나게 해준 지휘관은 당신이 처음이군요." },
          { speaker: "주인공", text: "난 네가 가진 올곧은 힘이 백분 발휘될 수 있도록 판을 짜준 것뿐이야." },
          { speaker: "카인", text: "겸손해하지 마십시오. 무모하게 방패만 밀어붙이던 막내기사에게 '지켜야 할 타이밍'을 알려준 건 당신입니다. 아직 부족한 몸이지만, 당신의 명령이라면 그 어떤 선봉이라도 기꺼이 맡겠습니다." },
        ]
      },
      50: {
        title: "전우",
        lines: [
          { speaker: "카인", text: "하핫, 제 푸른 번개 장벽이 적들의 일제 사격을 완벽히 튕겨내는 걸 보셨습니까? 당신이 제 등 뒤에 있으면 온몸에 힘이 솟구치는 기분입니다." },
          { speaker: "주인공", text: "정말 든든했어, 카인. 네가 앞에서 버텨주지 않았다면 위험했을 거야." },
          { speaker: "카인", text: "지휘관을 보호하는 것이 이 카인의 의무이자 특권이니까요. 제 갑옷과 방패가 부서지지 않는 한, 적들의 그 어떤 칼날도 당신의 옷깃조차 스치지 못할 겁니다. 저만 믿고 마음껏 명령을 내려주십시오!" },
        ]
      },
      75: {
        title: "사연",
        lines: [
          { speaker: "카인", text: "사실… 가문에서 저를 이 잔혹한 전장에 보냈을 때, 저는 무서웠습니다. 위대하고 완벽한 형들과 달리 저는 언제나 철부지 막내였으니까요. 가문의 이름을 더럽히지 않기 위해, 약한 모습을 숨기려 일부러 더 크게 소리치고 방패를 무겁게 쥐었던 것 같습니다." },
          { speaker: "주인공", text: "넌 가문을 빛내기 위해서가 아니라, 이미 우리를 지켜주는 위대한 영웅이야, 카인." },
          { speaker: "카인", text: "…형들도 부모님도 제게 그저 '가문의 이름에 걸맞은 기사가 되라'고만 했습니다. 오직 당신만이 가문이 아닌 '카인'이라는 나 자신을 인정해 주는군요. 고맙습니다. 당신의 그 말이 제 방패를 이전보다 훨씬 더 단단하게 만들어 줍니다." },
        ]
      },
      100: {
        title: "유대",
        lines: [
          { speaker: "카인", text: "가문이 가르친 정의가 아니라, 제 심장이 가리키는 정의를 찾았습니다. 제 방패가 수호해야 할 진정한 세계는… 바로 제 눈앞에 있는 당신입니다." },
          { speaker: "주인공", text: "앞으로 어떤 거대한 적이 앞길을 막아서더라도, 나와 함께 가줄래?" },
          { speaker: "카인", text: "제 숨이 붙어 있는 한, 그 어떤 어둠도 당신을 삼키지 못할 것입니다.", action: "방패를 바닥에 강하게 내리찍으며 굳건한 눈빛으로." },
          { speaker: "카인", text: "가문의 막내 아들이 아닌, 당신만을 위한 영원한 수호기사로서… 제 목숨을 바쳐 당신을 지키겠습니다." },
        ]
      },
    }
  },

}; // end DIALOGUE_DATA

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DialogueScene 클래스
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class DialogueScene {
  constructor() {
    this._lines    = [];
    this._idx      = 0;
    this._typing   = false;
    this._fullText = "";
    this._timer    = null;
    this._onClose  = null;
  }

  // ── 대화 씬 실행 ──────────────────────────────
  show(partyKey, affLevel, onClose = null) {
    const data = DIALOGUE_DATA[partyKey];
    if (!data) return;

    // 정확한 단계 찾기 (30/50/75/100)
    const levels = [30, 50, 75, 100];
    const level  = levels.includes(affLevel) ? affLevel : null;
    if (!level || !data.dialogues[level]) return;

    this._lines   = data.dialogues[level].lines;
    this._idx     = 0;
    this._onClose = onClose;

    this._buildUI(data, level);
    this._showLine();
  }

  // ── UI 생성 ───────────────────────────────────
  _buildUI(data, level) {
    const old = document.getElementById("dialogueOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "dialogueOverlay";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:8000;
      background:rgba(0,0,0,0.82);
      display:flex;flex-direction:column;
      align-items:center;justify-content:flex-end;
      padding-bottom:40px;
      animation:cutinFadeIn .4s ease;
    `;

    // 레벨 배지
    const levelColors = { 30:"#88ddff", 50:"#88ff88", 75:"#ffaa44", 100:"#FFD700" };
    const levelNames  = { 30:"첫 신뢰", 50:"전우", 75:"사연", 100:"유대" };

    overlay.innerHTML = `
      <!-- 동료 포트레이트 -->
      <div id="dlgPortraitWrap" style="
        position:absolute;bottom:220px;left:50%;transform:translateX(-50%);
        display:flex;align-items:flex-end;gap:32px;pointer-events:none;">
        <img id="dlgPortrait" src="${data.portrait}"
          style="height:min(340px,50vh);object-fit:contain;
          filter:drop-shadow(0 8px 32px rgba(0,0,0,0.9));
          animation:poke-player-idle 3s ease-in-out infinite;"
          onerror="this.style.display='none'"/>
      </div>

      <!-- 대화창 -->
      <div style="
        width:min(720px,92vw);
        background:rgba(8,4,10,0.96);
        border:2px solid #4a2e58;
        border-radius:8px;
        padding:20px 24px 16px;
        position:relative;z-index:1;
      ">
        <!-- 헤더 -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span id="dlgSpeaker" style="
              font-size:.95rem;font-weight:700;color:var(--gold2);
              font-family:'Noto Serif KR',serif;"></span>
            <span style="
              font-size:.65rem;padding:2px 8px;border-radius:10px;
              background:rgba(255,255,255,.08);
              color:${levelColors[level]};border:1px solid ${levelColors[level]}44;">
              ❤ ${level} — ${levelNames[level]}
            </span>
          </div>
          <div style="font-size:.62rem;color:var(--text-dim);" id="dlgProgress"></div>
        </div>

        <!-- 지문 -->
        <div id="dlgAction" style="
          font-size:.72rem;color:#aa88cc;
          font-style:italic;margin-bottom:6px;min-height:18px;
          font-family:'Noto Serif KR',serif;"></div>

        <!-- 대화 텍스트 -->
        <div id="dlgText" style="
          font-size:.92rem;color:var(--text);line-height:1.9;
          min-height:60px;font-family:'Noto Serif KR',serif;
          letter-spacing:.02em;"></div>

        <!-- 하단 -->
        <div style="display:flex;justify-content:flex-end;margin-top:12px;">
          <button id="dlgNext" style="
            background:transparent;border:1px solid #6a4a78;
            color:#cc88ff;padding:8px 20px;cursor:pointer;
            font-family:inherit;font-size:.8rem;border-radius:4px;
            transition:.15s;letter-spacing:.08em;"
            onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold2)'"
            onmouseout="this.style.borderColor='#6a4a78';this.style.color='#cc88ff'">
            다음 ▶
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 다음 버튼 / 클릭 시 타이핑 완료 or 다음 줄
    document.getElementById("dlgNext").addEventListener("click", () => this._onNext());
    overlay.addEventListener("click", (e) => {
      if (e.target.id !== "dlgNext") this._onNext();
    });
  }

  _showLine() {
    const line = this._lines[this._idx];
    if (!line) { this._close(); return; }

    const isHero = line.speaker === "주인공";
    const speakerEl = document.getElementById("dlgSpeaker");
    const actionEl  = document.getElementById("dlgAction");
    const textEl    = document.getElementById("dlgText");
    const progressEl= document.getElementById("dlgProgress");
    const nextBtn   = document.getElementById("dlgNext");

    if (speakerEl) {
      speakerEl.textContent = line.speaker;
      speakerEl.style.color = isHero ? "#88ddff" : "var(--gold2)";
    }
    if (actionEl)  actionEl.textContent  = line.action ? `— ${line.action}` : "";
    if (textEl)    textEl.textContent    = "";
    if (progressEl) progressEl.textContent = `${this._idx + 1} / ${this._lines.length}`;
    if (nextBtn)   nextBtn.textContent   = this._idx < this._lines.length - 1 ? "다음 ▶" : "닫기 ✕";

    // 포트레이트 페이드 (주인공 대사면 흐리게)
    const portrait = document.getElementById("dlgPortrait");
    if (portrait) portrait.style.opacity = isHero ? "0.4" : "1";

    // 타이핑 효과
    this._typeText(line.text, textEl);
  }

  _typeText(text, el) {
    if (!el) return;
    clearTimeout(this._timer);
    this._fullText = text;
    this._typing   = true;
    let i = 0;
    el.textContent = "";

    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        this._timer = setTimeout(tick, 22);
      } else {
        this._typing = false;
      }
    };
    tick();
  }

  _onNext() {
    if (this._typing) {
      // 타이핑 중이면 즉시 완성
      clearTimeout(this._timer);
      this._typing = false;
      const el = document.getElementById("dlgText");
      if (el) el.textContent = this._fullText;
      return;
    }

    this._idx++;
    if (this._idx >= this._lines.length) {
      this._close();
    } else {
      this._showLine();
    }
  }

  _close() {
    const overlay = document.getElementById("dialogueOverlay");
    if (overlay) {
      overlay.style.animation = "cutinFadeOut .3s ease forwards";
      setTimeout(() => overlay.remove(), 300);
    }
    clearTimeout(this._timer);
    if (this._onClose) this._onClose();
  }
}

// ── 전역 인스턴스 ──────────────────────────────────
window.dialogueScene = new DialogueScene();
window.DIALOGUE_DATA = DIALOGUE_DATA;
window.DialogueScene = DialogueScene;
