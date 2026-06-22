// Female avatars — real photo-style images
export const FEMALE_AVATARS = [
  { id: 'fav1',  src: require('../../assets/avatars/fav1.jpg')  },
  { id: 'fav2',  src: require('../../assets/avatars/fav2.jpg')  },
  { id: 'fav3',  src: require('../../assets/avatars/fav3.jpg')  },
  { id: 'fav4',  src: require('../../assets/avatars/fav4.jpg')  },
  { id: 'fav5',  src: require('../../assets/avatars/fav5.jpg')  },
  { id: 'fav6',  src: require('../../assets/avatars/fav6.jpg')  },
  { id: 'fav7',  src: require('../../assets/avatars/fav7.jpg')  },
  { id: 'fav8',  src: require('../../assets/avatars/fav8.jpg')  },
  { id: 'fav9',  src: require('../../assets/avatars/fav9.jpg')  },
  { id: 'fav10', src: require('../../assets/avatars/fav10.jpg') },
  { id: 'fav11', src: require('../../assets/avatars/fav11.jpg') },
  { id: 'fav12', src: require('../../assets/avatars/fav12.jpg') },
  { id: 'fav13', src: require('../../assets/avatars/fav13.jpg') },
  { id: 'fav14', src: require('../../assets/avatars/fav14.jpg') },
  { id: 'fav15', src: require('../../assets/avatars/fav15.jpg') },
  { id: 'fav16', src: require('../../assets/avatars/fav16.jpg') },
  { id: 'fav17', src: require('../../assets/avatars/fav17.jpg') },
  { id: 'fav18', src: require('../../assets/avatars/fav18.jpg') },
  { id: 'fav19', src: require('../../assets/avatars/fav19.jpg') },
  { id: 'fav20', src: require('../../assets/avatars/fav20.jpg') },
  { id: 'fav21', src: require('../../assets/avatars/fav21.jpg') },
  { id: 'fav22', src: require('../../assets/avatars/fav22.jpg') },
  { id: 'fav23', src: require('../../assets/avatars/fav23.jpg') },
];

// Male avatars — real photo-style images
export const MALE_AVATARS = [
  { id: 'mav1',  src: require('../../assets/avatars/mav1.png')  },
  { id: 'mav2',  src: require('../../assets/avatars/mav2.jpg')  },
  { id: 'mav3',  src: require('../../assets/avatars/mav3.jpg')  },
  { id: 'mav4',  src: require('../../assets/avatars/mav4.jpg')  },
  { id: 'mav5',  src: require('../../assets/avatars/mav5.jpg')  },
  { id: 'mav6',  src: require('../../assets/avatars/mav6.jpg')  },
  { id: 'mav7',  src: require('../../assets/avatars/mav7.jpg')  },
  { id: 'mav8',  src: require('../../assets/avatars/mav8.jpg')  },
  { id: 'mav9',  src: require('../../assets/avatars/mav9.png')  },
  { id: 'mav10', src: require('../../assets/avatars/mav10.jpg') },
  { id: 'mav11', src: require('../../assets/avatars/mav11.jpg') },
  { id: 'mav12', src: require('../../assets/avatars/mav12.jpg') },
  { id: 'mav13', src: require('../../assets/avatars/mav13.png') },
];

// Combined list (used by avatarSource lookup)
export const AVATARS = [...FEMALE_AVATARS, ...MALE_AVATARS];

const BY_ID = AVATARS.reduce((m, a) => { m[a.id] = a.src; return m; }, {});

export function avatarSource(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.startsWith('http')) return { uri: value };
  return BY_ID[value] || null;
}

// Returns gender-appropriate avatar list for the picker
export function avatarsForGender(gender) {
  return gender === 'female' ? FEMALE_AVATARS : MALE_AVATARS;
}
