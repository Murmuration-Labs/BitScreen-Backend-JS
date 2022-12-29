import _ from 'lodash';
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

export const formatDate = (date) =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export const addTextToNonce = (nonce: string, walletAddress: string) => {
  const customMessage = `Welcome to BitScreen!
    
    Your authentication status will be reset after 1 week.
    
    Wallet address:
    ${walletAddress}
    
    Nonce:
    ${nonce}
    `;

  return customMessage;
};

export const formatTime = (date) =>
  new Date(date).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

export const getEnumKeyFromValue = (enumKey: any, enumType: any) => {
  return Object.keys(enumType)[Object.values(enumType).indexOf(enumKey)];
};

export const randomIntFromInterval = (min: number, max: number) => {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const getDatesIntervalArray = (
  numberOfMonthsInThePast: number,
  numberOfMonthsStep: number
) => {
  const datesIntervalArray: {
    fromDate: Date;
    toDate: Date;
  }[] = [];

  const numberOfIterations = Math.ceil(
    numberOfMonthsInThePast / numberOfMonthsStep
  );
  for (let i = numberOfIterations; i > 0; i--) {
    if (i === numberOfIterations) {
      datesIntervalArray.push(
        getDatesInterval(
          numberOfMonthsInThePast,
          (numberOfIterations - 1) * numberOfMonthsStep
        )
      );
    } else {
      datesIntervalArray.push(
        getDatesInterval(i * numberOfMonthsStep, (i - 1) * numberOfMonthsStep)
      );
    }
  }

  return datesIntervalArray;
};

export const getDatesInterval = (
  monthsAgoFrom: number,
  monthsAgoTo?: number
) => {
  const fromDate = new Date(
    new Date().setMonth(new Date().getMonth() - monthsAgoFrom)
  );
  const toDate: Date =
    !monthsAgoTo || monthsAgoTo >= monthsAgoFrom
      ? new Date()
      : new Date(new Date().setMonth(new Date().getMonth() - monthsAgoTo));
  return { fromDate, toDate };
};

export const getRandomIntsWhichSumToX = (
  x: number,
  numberOfInts: number,
  minimumValueOfInt: number
) => {
  const minSum = minimumValueOfInt * numberOfInts;
  const delta = x - minSum;
  const numbers: number[] = [];
  let finalNumbers: number[] = [];

  for (let i = 0; i < numberOfInts; i++) {
    numbers.push(Math.random());
  }

  const numbersSum = numbers.reduce((partialSum, a) => partialSum + a, 0);

  for (let i = 0; i < numbers.length; i++) {
    if (i !== numbers.length - 1) {
      finalNumbers.push(Math.floor((numbers[i] / numbersSum) * delta));
    } else {
      finalNumbers.push(
        delta - finalNumbers.reduce((partialSum, a) => partialSum + a, 0)
      );
    }
  }

  finalNumbers = finalNumbers.map((e) => e + minimumValueOfInt);

  return finalNumbers;
};

export const getRandomItem = (arr: Array<any>) => {
  const randomIndex = Math.floor(Math.random() * arr.length);

  const item = arr[randomIndex];

  return item;
};

export const delay = (time: number) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};
