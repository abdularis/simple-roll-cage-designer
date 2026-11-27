/* LC Racing LC12B1 reference data, measured from the v2.30 manual. See docs/MANUAL-MEASUREMENTS.md.
 * Loaded by index.html (window.CAR_LC12B1), tools/check.mjs and tools/proof_underlays.py. Keep it valid JSON after the '=' sign. */
globalThis.CAR_LC12B1 = {
  "car": "LC Racing LC12B1 (1/12 4WD buggy)",
  "source": "LC12B1 manual v2.30: p.30 chassis top view, p.31 assembled top view. See docs/MANUAL-MEASUREMENTS.md",
  "underlays": {
    "chassis": {
      "src": "assets/underlay-chassis.png",
      "label": "Chassis (manual p.30)",
      "ox": 444.0,
      "oy": 281.0,
      "mmPerPx": 0.42435,
      "w": 800,
      "h": 550
    },
    "body": {
      "src": "assets/underlay-body.png",
      "label": "Body and wing (manual p.31)",
      "ox": 477.0,
      "oy": 251.4,
      "mmPerPx": 0.42687,
      "w": 834,
      "h": 504
    }
  },
  "keepouts": [
    { "id": "plate", "name": "Chassis plate and side guards",
      "kind": "box",
      "c": [
        -3.5,
        0,
        17
      ],
      "s": [
        187,
        100,
        4
      ],
      "check": false,
      "mount": true,
      "note": "p.30 outline; height estimated. Mount surface: the cage feet sit on this plate"
    },
    { "id": "deck", "name": "Top deck (carbon)",
      "kind": "box",
      "c": [
        -0.5,
        0,
        45
      ],
      "s": [
        197,
        19,
        2
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "wfl", "name": "Wheel front left",
      "kind": "wheel",
      "c": [
        115,
        88.4,
        33.5
      ],
      "s": [
        67,
        28,
        67
      ],
      "check": true,
      "note": "p.31 tyre; no steering sweep"
    },
    { "id": "wfr", "name": "Wheel front right",
      "kind": "wheel",
      "c": [
        115,
        -88.4,
        33.5
      ],
      "s": [
        67,
        28,
        67
      ],
      "check": true,
      "note": "p.31 tyre; no steering sweep"
    },
    { "id": "wrl", "name": "Wheel rear left",
      "kind": "wheel",
      "c": [
        -115,
        86.3,
        35.6
      ],
      "s": [
        71,
        35,
        71
      ],
      "check": true,
      "note": "p.31 tyre"
    },
    { "id": "wrr", "name": "Wheel rear right",
      "kind": "wheel",
      "c": [
        -115,
        -86.3,
        35.6
      ],
      "s": [
        71,
        35,
        71
      ],
      "check": true,
      "note": "p.31 tyre"
    },
    { "id": "batt", "name": "Battery 2S (rear right)",
      "kind": "box",
      "c": [
        -51.6,
        -21.4,
        26.5
      ],
      "s": [
        91,
        32,
        19
      ],
      "check": true,
      "note": "p.30 outline; 19 mm pack height"
    },
    { "id": "motor", "name": "Motor and mount (mid left)",
      "kind": "box",
      "c": [
        -33.5,
        22,
        32.5
      ],
      "s": [
        51,
        34,
        31
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "spur", "name": "Spur gear and slipper cover",
      "kind": "box",
      "c": [
        14,
        1.5,
        33.5
      ],
      "s": [
        28,
        32,
        33
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "servo", "name": "Servo (front right)",
      "kind": "box",
      "c": [
        53.5,
        -18.2,
        28.5
      ],
      "s": [
        38,
        25.5,
        23
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "esc", "name": "ESC (front left)",
      "kind": "box",
      "c": [
        49.2,
        23.1,
        26.5
      ],
      "s": [
        42.4,
        32,
        19
      ],
      "check": true,
      "note": "p.30 outline; 16 mm ESC + fins"
    },
    { "id": "rgear", "name": "Rear gearbox and arm mounts",
      "kind": "box",
      "c": [
        -115,
        0,
        34
      ],
      "s": [
        32,
        74,
        32
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "rtower", "name": "Rear shock tower",
      "kind": "box",
      "c": [
        -138.5,
        0,
        50
      ],
      "s": [
        11,
        68,
        50
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "rshl", "name": "Rear shock left",
      "kind": "box",
      "c": [
        -136.5,
        47.5,
        50
      ],
      "s": [
        27,
        47,
        50
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "rshr", "name": "Rear shock right",
      "kind": "box",
      "c": [
        -136.5,
        -47.5,
        50
      ],
      "s": [
        27,
        47,
        50
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "wingpost", "name": "Wing mount posts",
      "kind": "box",
      "c": [
        -161,
        0,
        70
      ],
      "s": [
        38,
        24,
        50
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "wing", "name": "Rear wing",
      "kind": "box",
      "c": [
        -167.5,
        0,
        102
      ],
      "s": [
        66,
        154,
        14
      ],
      "check": true,
      "note": "p.31 outline; height estimated. Untick if you remove the wing"
    },
    { "id": "fgear", "name": "Front gearbox and arm mounts",
      "kind": "box",
      "c": [
        113,
        0,
        33
      ],
      "s": [
        34,
        60,
        30
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "ftower", "name": "Front shocks and tower",
      "kind": "box",
      "c": [
        119,
        0,
        44
      ],
      "s": [
        26,
        102,
        44
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "steer", "name": "Steering links",
      "kind": "box",
      "c": [
        94,
        0,
        26
      ],
      "s": [
        8,
        160,
        8
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    },
    { "id": "bumper", "name": "Front bumper",
      "kind": "box",
      "c": [
        135.5,
        0,
        21
      ],
      "s": [
        7,
        42,
        12
      ],
      "check": true,
      "note": "p.30 outline; height estimated"
    }
  ],
  "example": {
    "name": "EMB-DT style cage (example)",
    "notes": "Inspired by the LC Racing EMB-DT cage, with a desert buggy tail: tall cabin, a windshield hoop leaning back, braced roof, door bars, a flat nose hoop over the front shocks, and rear down tubes that slope from the roof to a point just ahead of the rear shocks. The whole cage lifts off for battery access.\nFour bent parts (main hoop, front hoop, front nose hoop, rear down hoop). Everything else is straight 3 mm rod.\n\nBuild order:\n1. Bend the main hoop, front hoop, front nose hoop and rear down hoop. Check each against its printed template.\n2. Cut both floor rails. Braze the main and front hoop feet onto them, hoops held square on the templates.\n3. Roof rails, then the roof brace. Front nose hoop onto the front hoop legs, then the nose brace.\n4. Door bars and rear stays.\n5. Rear down hoop onto the main hoop, then the rear lower bars from the floor rail ends up to its corners, then the rear brace.\nStraight pieces: cut about 10 mm long and file each end to fit against the tube it meets.\n\nMounting: braze 4 small tabs (brass sheet) under the floor rails near X -85 and X +70, and hold the cage with body clips or 2.6 mm screws so it lifts off like the EMB-DT's.\nTight spot: the tail ends 3.5 mm in front of the rear shocks. The shock keep-outs are estimates, so measure where your rear shocks sit before bending the rear down hoop.",
    "tubes": [
      { "id": "main", "name": "Main hoop",
        "color": 0,
        "mirror": false,
        "pts": [
          [
            -20,
            47,
            21
          ],
          [
            -20,
            47,
            70
          ],
          [
            -20,
            36,
            125
          ],
          [
            -20,
            -36,
            125
          ],
          [
            -20,
            -47,
            70
          ],
          [
            -20,
            -47,
            21
          ]
        ]
      },
      { "id": "front", "name": "Front hoop",
        "color": 1,
        "mirror": false,
        "pts": [
          [
            78,
            47,
            21
          ],
          [
            30,
            33,
            120
          ],
          [
            30,
            -33,
            120
          ],
          [
            78,
            -47,
            21
          ]
        ]
      },
      { "id": "floor", "name": "Floor rail",
        "color": 6,
        "mirror": true,
        "pts": [
          [
            -90,
            47,
            21
          ],
          [
            78,
            47,
            21
          ]
        ]
      },
      { "id": "roof", "name": "Roof rail",
        "color": 2,
        "mirror": true,
        "pts": [
          [
            -20,
            36,
            125
          ],
          [
            30,
            33,
            120
          ]
        ]
      },
      { "id": "brace", "name": "Roof brace",
        "color": 5,
        "mirror": false,
        "pts": [
          [
            -20,
            36,
            125
          ],
          [
            30,
            -33,
            120
          ]
        ]
      },
      { "id": "nose", "name": "Front nose hoop",
        "color": 3,
        "mirror": false,
        "pts": [
          [
            51.8,
            39.4,
            75
          ],
          [
            145,
            30,
            75
          ],
          [
            145,
            -30,
            75
          ],
          [
            51.8,
            -39.4,
            75
          ]
        ]
      },
      { "id": "nbrace", "name": "Nose brace",
        "color": 5,
        "mirror": false,
        "pts": [
          [
            51.8,
            39.4,
            75
          ],
          [
            145,
            -30,
            75
          ]
        ]
      },
      { "id": "door", "name": "Door bar",
        "color": 4,
        "mirror": true,
        "pts": [
          [
            -20,
            47,
            70
          ],
          [
            66.4,
            43.6,
            45
          ]
        ]
      },
      { "id": "stay", "name": "Rear stay",
        "color": 3,
        "mirror": true,
        "pts": [
          [
            -20,
            45,
            80
          ],
          [
            -90,
            47,
            21
          ]
        ]
      },
      { "id": "rear", "name": "Rear down hoop",
        "color": 7,
        "mirror": false,
        "pts": [
          [
            -20,
            38,
            115
          ],
          [
            -118,
            42,
            60
          ],
          [
            -118,
            -42,
            60
          ],
          [
            -20,
            -38,
            115
          ]
        ]
      },
      { "id": "lower", "name": "Rear lower bar",
        "color": 6,
        "mirror": true,
        "pts": [
          [
            -90,
            47,
            21
          ],
          [
            -118,
            42,
            60
          ]
        ]
      },
      { "id": "rbrace", "name": "Rear brace",
        "color": 4,
        "mirror": false,
        "pts": [
          [
            -20,
            38,
            115
          ],
          [
            -118,
            -42,
            60
          ]
        ]
      }
    ],
    "previousSignatures": [
      "[[[-20,47,21],[-20,47,60],[-20,36,105],[-20,-36,105],[-20,-47,60],[-20,-47,21]],[[78,47,21],[35,33,100],[35,-33,100],[78,-47,21]],[[-90,47,21],[78,47,21]],[[-20,36,105],[35,33,100]],[[-20,36,105],[35,-33,100]],[[-20,39.7,90],[-90,47,21]],[[-20,47,60],[64.9,42.7,45]]]",
      "[[[-20,47,21],[-20,47,60],[-20,36,105],[-20,-36,105],[-20,-47,60],[-20,-47,21]],[[78,47,21],[35,33,100],[35,-33,100],[78,-47,21]],[[-90,47,21],[78,47,21]],[[-20,36,105],[35,33,100]],[[-20,36,105],[35,-33,100]],[[-20,47,60],[64.9,42.7,45]],[[-20,44.6,70],[-90,47,21]],[[-90,47,21],[-90,42.3,84]],[[-20,39.7,90],[-137,44,80],[-137,-44,80],[-20,-39.7,90]],[[-90,42.3,84],[-90,-42.3,84]],[[-90,42.3,84],[-137,-44,80]]]",
      "[[[-20,47,21],[-20,47,70],[-20,36,125],[-20,-36,125],[-20,-47,70],[-20,-47,21]],[[78,47,21],[30,33,120],[30,-33,120],[78,-47,21]],[[-90,47,21],[78,47,21]],[[-20,36,125],[30,33,120]],[[-20,36,125],[30,-33,120]],[[-20,47,70],[66.4,43.6,45]],[[-20,45,80],[-90,47,21]],[[-20,38,115],[-118,42,60],[-118,-42,60],[-20,-38,115]],[[-90,47,21],[-118,42,60]],[[-20,38,115],[-118,-42,60]]]"
    ]
  }
};
