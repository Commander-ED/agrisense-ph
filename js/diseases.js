// ============================================================
// diseases.js
// Database ng lahat ng sakit na kaya ng AgriSense PH
// na i-detect. Para sa bawat sakit, nakalagay dito ang:
//   - warning flag (may sakit ba o hindi?)
//   - treatment steps sa Filipino at English
//   - voice messages sa Filipino at English
//
// Para magdagdag ng bagong sakit:
// 1. Idagdag sa tamang crop section (DISEASES.rice o DISEASES.tomato)
// 2. Sundan ang parehong format ng ibang entries
// 3. I-retrain ang model sa Teachable Machine
// ============================================================

const DISEASES = {

  // ============================================================
  // RICE DISEASES
  // Mga sakit ng palay na kaya ng app suriin.
  // ============================================================
  rice: {

    // ----------------------------------------------------------
    // Healthy Rice
    // Kapag walang sakit ang dahon ng palay.
    // ----------------------------------------------------------
    'Healthy Rice': {
      warning: false, // false = walang sakit, hindi kailangan ng treatment

      fil: {
        title: 'Malusog ang Dahon!',
        steps: [
          'Walang sakit na nakita sa inyong palay.',
          'Ipagpatuloy ang tamang pag-aalaga.',
          'Siguraduhing may sapat na tubig at pataba.',
          'Bantayan pa rin kahit malusog — mas madaling pigilan ang sakit kaysa gamutin.'
        ]
      },

      eng: {
        title: 'Leaf is Healthy!',
        steps: [
          'No disease detected on your rice.',
          'Continue proper care and maintenance.',
          'Ensure adequate water and fertilizer.',
          'Keep monitoring — prevention is easier than treatment.'
        ]
      },

      voice: {
        fil: 'Ang dahon ng palay ay malusog. Walang sakit na nakita. Ipagpatuloy ang tamang pag-aalaga ng inyong palay.',
        eng: 'The rice leaf is healthy. No disease detected. Continue proper care of your rice.'
      }
    },

    // ----------------------------------------------------------
    // Rice Blast (Magnaporthe oryzae)
    // Pinaka-mapanganib na sakit ng palay sa Pilipinas.
    // Kinakilala sa grey-white diamond-shaped spots.
    // ----------------------------------------------------------
    'Rice Blast': {
      warning: true,

      fil: {
        title: 'Lunas para sa Rice Blast',
        steps: [
          '1. Mag-spray AGAD ng fungicide na may tricyclazole o isoprothiolane.',
          '2. Bawasan ang pataba na nitrogen — nagpapalala ito ng blast.',
          '3. Alisin at sunugin ang mga may sakit na dahon.',
          '4. Pumili ng variety na lumalaban sa blast (hal. NSIC Rc480, NSIC Rc222).',
          '5. Iwasang mag-spray ng tubig sa mga dahon — lalo lang kumakalat ang spores.'
        ]
      },

      eng: {
        title: 'Treatment for Rice Blast',
        steps: [
          '1. Apply fungicide with tricyclazole or isoprothiolane IMMEDIATELY.',
          '2. Reduce nitrogen fertilizer — it worsens blast infection.',
          '3. Remove and burn infected leaves.',
          '4. Use blast-resistant varieties (e.g. NSIC Rc480, NSIC Rc222).',
          '5. Avoid overhead irrigation — it spreads spores.'
        ]
      },

      voice: {
        fil: 'Babala! Natukoy ang Rice Blast sa inyong palay. Mag-spray agad ng fungicide na may tricyclazole. Bawasan ang nitrogen fertilizer at alisin ang mga may sakit na dahon.',
        eng: 'Warning! Rice Blast detected on your rice. Apply fungicide with tricyclazole immediately. Reduce nitrogen fertilizer and remove infected leaves.'
      }
    },

    // ----------------------------------------------------------
    // Bacterial Leaf Blight (Xanthomonas oryzae)
    // Kilala sa yellow-orange watery stripe sa gilid ng dahon.
    // Kumakalat sa tubig at hangin — mapanganib sa tag-ulan.
    // ----------------------------------------------------------
    'Bacterial Leaf Blight': {
      warning: true,

      fil: {
        title: 'Lunas para sa Bacterial Leaf Blight',
        steps: [
          '1. Huwag mag-spray ng tubig sa mga dahon — lalo lang kumakalat.',
          '2. Gumamit ng copper-based bactericide (hal. copper hydroxide).',
          '3. Alisan ng tubig ang bukid para hindi kumalat ang bacteria.',
          '4. Magtanim ng resistant variety (hal. NSIC Rc222, NSIC Rc160).',
          '5. Linisin ang mga tool at kagamitan bago gamitin sa ibang taniman.'
        ]
      },

      eng: {
        title: 'Treatment for Bacterial Leaf Blight',
        steps: [
          '1. Avoid overhead irrigation — it spreads the bacteria further.',
          '2. Apply copper-based bactericide (e.g. copper hydroxide).',
          '3. Drain the field to reduce bacterial spread.',
          '4. Plant resistant varieties (e.g. NSIC Rc222, NSIC Rc160).',
          '5. Clean tools and equipment before using in other fields.'
        ]
      },

      voice: {
        fil: 'Babala! Natukoy ang Bacterial Leaf Blight. Gumamit ng copper bactericide at alisan ng tubig ang bukid. Huwag mag-spray ng tubig sa mga dahon.',
        eng: 'Warning! Bacterial Leaf Blight detected. Use copper bactericide and drain the field. Avoid overhead irrigation.'
      }
    },

    // ----------------------------------------------------------
    // Brown Spot (Cochliobolus miyabeanus)
    // Kilala sa round brown spots na may yellow halo.
    // Kadalasang sanhi ng poor nutrition sa lupa.
    // ----------------------------------------------------------
    'Brown Spot': {
      warning: true,

      fil: {
        title: 'Lunas para sa Brown Spot',
        steps: [
          '1. Mag-spray ng mancozeb o propiconazole fungicide.',
          '2. Dagdagan ang potassium at zinc fertilizer — kakulangan nito ang sanhi.',
          '3. Siguraduhing maayos ang drainage ng bukid.',
          '4. Mag-treat ng binhi ng fungicide bago magtanim.',
          '5. Huwag mag-tanim nang masyadong siksik — kailangan ng hangin ang halaman.'
        ]
      },

      eng: {
        title: 'Treatment for Brown Spot',
        steps: [
          '1. Apply mancozeb or propiconazole fungicide.',
          '2. Add potassium and zinc fertilizer — deficiency is a common cause.',
          '3. Ensure proper field drainage.',
          '4. Treat seeds with fungicide before planting.',
          '5. Avoid overcrowding — plants need proper air circulation.'
        ]
      },

      voice: {
        fil: 'Babala! Natukoy ang Brown Spot sa inyong palay. Mag-spray ng mancozeb fungicide at dagdagan ang potassium at zinc fertilizer.',
        eng: 'Warning! Brown Spot detected on your rice. Apply mancozeb fungicide and add potassium and zinc fertilizer.'
      }
    },

    // ----------------------------------------------------------
    // Not a Leaf (Rice)
    // Kapag ang ipinakita ay hindi dahon ng palay.
    // ----------------------------------------------------------
    'Not a Leaf': {
      warning: false,

      fil: {
        title: 'Hindi Dahon ng Palay',
        steps: [
          'Ang ipinakita ay hindi mukhang dahon ng palay.',
          'Itutok ang camera sa isang dahon ng palay.',
          'Siguraduhing malinaw ang larawan at may sapat na ilaw.',
          'Ang dahon ay dapat puno ng frame — hindi masyadong malayo.'
        ]
      },

      eng: {
        title: 'Not a Rice Leaf',
        steps: [
          'The image shown does not appear to be a rice leaf.',
          'Point the camera directly at a rice leaf.',
          'Make sure the photo is clear with adequate lighting.',
          'The leaf should fill most of the frame — not too far away.'
        ]
      },

      voice: {
        fil: 'Hindi ito mukhang dahon ng palay. Pakitutok ang camera sa dahon ng palay at subukang muli.',
        eng: 'This does not appear to be a rice leaf. Please point the camera at a rice leaf and try again.'
      }
    }
  },

  // ============================================================
  // TOMATO DISEASES
  // Mga sakit ng kamatis na kaya ng app suriin.
  // ============================================================
  tomato: {

    // ----------------------------------------------------------
    // Healthy Tomato
    // ----------------------------------------------------------
    'Healthy Tomato': {
      warning: false,

      fil: {
        title: 'Malusog ang Dahon!',
        steps: [
          'Walang sakit na nakita sa inyong kamatis.',
          'Ipagpatuloy ang tamang pag-aalaga.',
          'Siguraduhing may sapat na tubig at sustansya.',
          'Regular na bantayan — lalo na sa tag-ulan na panahon.'
        ]
      },

      eng: {
        title: 'Leaf is Healthy!',
        steps: [
          'No disease detected on your tomato.',
          'Continue proper care and maintenance.',
          'Ensure adequate water and nutrients.',
          'Monitor regularly — especially during rainy season.'
        ]
      },

      voice: {
        fil: 'Ang dahon ng kamatis ay malusog. Walang sakit na nakita. Ipagpatuloy ang tamang pag-aalaga.',
        eng: 'The tomato leaf is healthy. No disease detected. Continue proper care.'
      }
    },

    // ----------------------------------------------------------
    // Early Blight (Alternaria solani)
    // Kinakilala sa dark brown spots na may yellow ring —
    // tulad ng target o bullseye pattern.
    // ----------------------------------------------------------
    'Early Blight': {
      warning: true,

      fil: {
        title: 'Lunas para sa Early Blight',
        steps: [
          '1. Mag-spray ng chlorothalonil o mancozeb fungicide.',
          '2. Alisin ang mga apektadong dahon sa ibaba ng halaman.',
          '3. Huwag mag-dilig ng gabi — panatilihing tuyo ang mga dahon.',
          '4. Mag-mulch sa paligid ng halaman para hindi tumapon ang lupa.',
          '5. Mag-spray ulit tuwing 7–10 araw hanggang humupa ang sakit.'
        ]
      },

      eng: {
        title: 'Treatment for Early Blight',
        steps: [
          '1. Apply chlorothalonil or mancozeb fungicide.',
          '2. Remove affected lower leaves from the plant.',
          '3. Avoid evening watering — keep leaves dry overnight.',
          '4. Apply mulch around plant base to prevent soil splash.',
          '5. Reapply every 7–10 days until disease subsides.'
        ]
      },

      voice: {
        fil: 'Babala! Natukoy ang Early Blight sa kamatis. Mag-spray ng chlorothalonil fungicide at alisin ang mga apektadong dahon sa ibaba.',
        eng: 'Warning! Early Blight detected on tomato. Apply chlorothalonil fungicide and remove affected lower leaves.'
      }
    },

    // ----------------------------------------------------------
    // Late Blight (Phytophthora infestans)
    // PINAKA-MAPANGANIB na sakit ng kamatis.
    // Mabilis kumakalat — kaya ng puksain ang buong taniman
    // sa loob ng ilang araw. Kailangan ng AGARANG aksyon.
    // ----------------------------------------------------------
    'Late Blight': {
      warning: true,

      fil: {
        title: 'AGARANG Lunas para sa Late Blight',
        steps: [
          '⚠ MABILIS KUMAKALAT ITO — kumilos agad!',
          '1. Mag-spray AGAD ng metalaxyl o copper fungicide.',
          '2. Alisin at ITAPON (huwag mag-compost) ang lahat ng may sakit.',
          '3. Mag-spray sa lahat ng halaman sa paligid — kahit walang sintomas.',
          '4. Mag-spray ulit tuwing 5–7 araw habang mahalumigmig ang panahon.',
          '5. Iwasang mag-spray ng tubig sa mga dahon.'
        ]
      },

      eng: {
        title: 'URGENT Treatment for Late Blight',
        steps: [
          '⚠ THIS SPREADS FAST — act immediately!',
          '1. Apply metalaxyl or copper fungicide IMMEDIATELY.',
          '2. Remove and DISCARD (do NOT compost) all infected parts.',
          '3. Spray surrounding plants too — even if no symptoms yet.',
          '4. Reapply every 5–7 days during wet weather.',
          '5. Avoid wetting the leaves when watering.'
        ]
      },

      voice: {
        fil: 'BABALA! Natukoy ang Late Blight sa kamatis. ITO AY MABILIS KUMAKALAT! Mag-spray AGAD ng metalaxyl fungicide at alisin ang lahat ng may sakit na bahagi.',
        eng: 'WARNING! Late Blight detected on tomato. THIS SPREADS FAST! Apply metalaxyl fungicide IMMEDIATELY and remove all infected parts.'
      }
    },

    // ----------------------------------------------------------
    // Leaf Mold (Passalora fulva)
    // Kilala sa yellow patches sa taas ng dahon at
    // olive-green fuzzy mold sa ilalim. Common sa greenhouses
    // at mga lugar na may mataas na humidity.
    // ----------------------------------------------------------
    'Leaf Mold': {
      warning: true,

      fil: {
        title: 'Lunas para sa Leaf Mold',
        steps: [
          '1. Mag-spray ng chlorothalonil o copper-based fungicide.',
          '2. Pagbutihin ang hangin sa paligid ng halaman — huwag masyadong siksik.',
          '3. Iwasang mabasa ang mga dahon kapag nagdidilig.',
          '4. Alisin agad ang mga apektadong dahon.',
          '5. Bawasan ang humidity sa paligid ng halaman kung posible.'
        ]
      },

      eng: {
        title: 'Treatment for Leaf Mold',
        steps: [
          '1. Apply chlorothalonil or copper-based fungicide.',
          '2. Improve air circulation — avoid overcrowding plants.',
          '3. Avoid wetting leaves when watering.',
          '4. Remove affected leaves promptly.',
          '5. Reduce humidity around plants if possible.'
        ]
      },

      voice: {
        fil: 'Babala! Natukoy ang Leaf Mold sa kamatis. Mag-spray ng copper fungicide at pagbutihin ang hangin sa paligid ng halaman.',
        eng: 'Warning! Leaf Mold detected on tomato. Apply copper fungicide and improve air circulation around the plant.'
      }
    },

    // ----------------------------------------------------------
    // Not a Leaf (Tomato)
    // ----------------------------------------------------------
    'Not a Leaf': {
      warning: false,

      fil: {
        title: 'Hindi Dahon ng Kamatis',
        steps: [
          'Ang ipinakita ay hindi mukhang dahon ng kamatis.',
          'Itutok ang camera sa isang dahon ng kamatis.',
          'Siguraduhing malinaw ang larawan at may sapat na ilaw.',
          'Ang dahon ay dapat puno ng frame — hindi masyadong malayo.'
        ]
      },

      eng: {
        title: 'Not a Tomato Leaf',
        steps: [
          'The image shown does not appear to be a tomato leaf.',
          'Point the camera directly at a tomato leaf.',
          'Make sure the photo is clear with adequate lighting.',
          'The leaf should fill most of the frame.'
        ]
      },

      voice: {
        fil: 'Hindi ito mukhang dahon ng kamatis. Pakitutok ang camera sa dahon ng kamatis at subukang muli.',
        eng: 'This does not appear to be a tomato leaf. Please point the camera at a tomato leaf and try again.'
      }
    }
  }
};
