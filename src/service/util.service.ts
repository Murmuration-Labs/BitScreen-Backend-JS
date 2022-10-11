import { isArray } from 'util';

export const filterFields = (objects, allowedFields) => {
  if (!isArray(objects)) {
    return [];
  }

  return objects.map((unfiltered) => {
    return allowedFields.reduce((obj, key) => {
      obj[key] = unfiltered[key];
      return obj;
    }, {});
  });
};

export const filterFieldsSingle = (object, allowedFields) => {
  return allowedFields.reduce((obj, key) => {
    obj[key] = object[key];
    return obj;
  }, {});
};

export const formatDate = (date) => new Date(date).toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

export const formatTime = (date) => new Date(date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });

export const getEnumKeyFromValue = (enumKey: any, enumType: any) => {
  return Object.keys(enumType)[Object.values(enumType).indexOf(enumKey)]
}