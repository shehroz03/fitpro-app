export const AVATARS = [
  { id: 'avatar1',  src: require('../../assets/avatars/avatar1.png')  },
  { id: 'avatar2',  src: require('../../assets/avatars/avatar2.png')  },
  { id: 'avatar3',  src: require('../../assets/avatars/avatar3.png')  },
  { id: 'avatar4',  src: require('../../assets/avatars/avatar4.png')  },
  { id: 'avatar5',  src: require('../../assets/avatars/avatar5.png')  },
  { id: 'avatar6',  src: require('../../assets/avatars/avatar6.png')  },
  { id: 'avatar7',  src: require('../../assets/avatars/avatar7.png')  },
  { id: 'avatar8',  src: require('../../assets/avatars/avatar8.png')  },
  { id: 'avatar9',  src: require('../../assets/avatars/avatar9.png')  },
  { id: 'avatar10', src: require('../../assets/avatars/avatar10.png') },
  { id: 'avatar11', src: require('../../assets/avatars/avatar11.png') },
  { id: 'avatar12', src: require('../../assets/avatars/avatar12.png') },
  { id: 'avatar13', src: require('../../assets/avatars/avatar13.png') },
  { id: 'avatar14', src: require('../../assets/avatars/avatar14.png') },
  { id: 'avatar15', src: require('../../assets/avatars/avatar15.png') },
];

const BY_ID = AVATARS.reduce((m, a) => { m[a.id] = a.src; return m; }, {});

export function avatarSource(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.startsWith('http')) return { uri: value };
  return BY_ID[value] || null;
}
