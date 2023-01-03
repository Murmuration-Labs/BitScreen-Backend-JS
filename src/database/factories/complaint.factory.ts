import { faker } from '@faker-js/faker';
import countryList from 'react-select-country-list';
import { define } from 'typeorm-seeding';
import { Assessor } from '../../entity/Assessor';
import {
  ComplainantType,
  Complaint,
  ComplaintStatus,
  ComplaintType,
  OnBehalfOf,
} from '../../entity/Complaint';
import { randomIntFromInterval } from '../../service/util.service';

define(
  Complaint,
  (fakerGenerator: typeof faker, context: { assessor?: Assessor }) => {
    const { assessor } = context;

    const sex = Math.floor(Math.random() * 2) === 0 ? 'male' : 'female';

    const firstName = fakerGenerator.name.firstName(sex);
    const lastName = fakerGenerator.name.lastName(sex);
    const countries = ['Global', ...countryList().getValues()];
    const numberOfScopes = Math.floor(Math.random() * 10) + 1;

    const complaint = new Complaint();
    complaint.created = fakerGenerator.date.recent(365 * 1.5);

    complaint.title = fakerGenerator.random.words();
    complaint.fullName = fakerGenerator.name.findName(firstName, lastName, sex);
    complaint.companyName = fakerGenerator.company.companyName();
    complaint.email = fakerGenerator.internet.email(firstName, lastName);
    complaint.phoneNumber = fakerGenerator.phone.phoneNumber();

    complaint.address =
      fakerGenerator.address.country() +
      ', ' +
      fakerGenerator.address.city() +
      ', ' +
      fakerGenerator.address.streetAddress(true);
    complaint.city = fakerGenerator.address.city();
    complaint.country = fakerGenerator.address.country();
    complaint.state =
      complaint.country === 'United States of America'
        ? fakerGenerator.address.state()
        : '';

    complaint.complaintDescription = fakerGenerator.random.words(
      Math.floor(Math.random() * 26) + 10
    );
    complaint.workDescription = fakerGenerator.random.words(
      Math.floor(Math.random() * 26) + 10
    );

    complaint.type = randomIntFromInterval(
      ComplaintType.Copyright,
      ComplaintType.Other
    );
    complaint.complainantType = Math.floor(
      Math.random() * Object.keys(ComplainantType).length
    );
    complaint.onBehalfOf = Math.floor(
      Math.random() * Object.keys(OnBehalfOf).length
    );

    complaint.geoScope = [];
    for (let i = 0; i < numberOfScopes; i++) {
      const selectedValueIndex = Math.floor(
        Math.random() * (countries.length + 1)
      );
      const selectedValue = countries[selectedValueIndex];
      complaint.geoScope.push(selectedValue);
      countries.splice(selectedValueIndex, 1);
    }

    complaint.agreement = true;

    // related to assessor
    if (assessor) {
      complaint.status = randomIntFromInterval(
        ComplaintStatus.UnderReview,
        ComplaintStatus.Spam
      );
      complaint.assessor = assessor;

      complaint.resolvedOn =
        complaint.status > 1
          ? fakerGenerator.date.between(
              complaint.created.valueOf() > assessor.created.valueOf()
                ? complaint.created
                : assessor.created,
              new Date()
            )
          : null;

      complaint.submitted = complaint.status > 1 ? Math.random() < 0.5 : false;
      complaint.submittedOn = complaint.submitted
        ? complaint.status === ComplaintStatus.Spam
          ? complaint.resolvedOn
          : fakerGenerator.date.between(complaint.resolvedOn, new Date())
        : null;

      complaint.privateNote = fakerGenerator.random.words(
        Math.floor(Math.random() * 26) + 10
      );
    } else {
      complaint.status = ComplaintStatus.New;

      complaint.resolvedOn = null;

      complaint.submitted = false;
      complaint.submittedOn = null;

      complaint.privateNote = null;
    }

    return complaint;
  }
);
