import { wallets } from '../helpers/walletsWithAccounts';
import { cids } from '../helpers/cids';
import _ from 'lodash';
import {
  getDatesIntervalArray,
  getRandomIntsWhichSumToX,
} from '../../service/util.service';
import { Factory, Seeder } from 'typeorm-seeding';
import { Assessor } from '../../entity/Assessor';
import { Provider } from '../../entity/Provider';
import { Config } from '../../entity/Settings';
import { Complaint } from '../../entity/Complaint';
import { Infringement } from '../../entity/Infringement';

export default class CreateDataSet implements Seeder {
  public async run(factory: Factory): Promise<any> {
    const walletsWithAccounts = [...wallets];
    const providerCreationConfig = {
      numberOfMonthsInThePast: 21,
      numberOfMonthsStep: 3,
      minimumNumberOfProvidersToCreate: 100,
    };

    const assessorCreationConfig = {
      minimumPercentageOfProvidersForAssessors: 0.6,
      maximumPercentageOfProvidersForAssessors: 0.8,
    };

    const complaintCreationConfig = {
      numberOfComplaints: 1500,
      minimumPercentageOfComplaintsEvaluated: 0.6,
      maximumPercentageOfComplaintsEvaluated: 0.75,
      minimumPercentageOfComplaintsEvaluatedPerAssessor: 0.01,
      minimumInfringementsPerComplaint: 1,
      maximumInfringementsPerComplaint: 6,
      percentageOfActiveAssessors: 0.85,
    };

    // creating the providers & assessors
    const {
      numberOfMonthsInThePast,
      numberOfMonthsStep,
      minimumNumberOfProvidersToCreate,
    } = providerCreationConfig;

    const {
      minimumPercentageOfProvidersForAssessors,
      maximumPercentageOfProvidersForAssessors,
    } = assessorCreationConfig;

    const minimumNumberOfAssessors = Math.ceil(
      minimumPercentageOfProvidersForAssessors *
        minimumNumberOfProvidersToCreate
    );
    const maximumNumberOfAssessors = Math.ceil(
      maximumPercentageOfProvidersForAssessors *
        minimumNumberOfProvidersToCreate
    );

    let previousProviderCreatedDate: Date | null = null;
    const allProvidersCreated: Provider[] = [];

    const datesIntervalArray = getDatesIntervalArray(
      numberOfMonthsInThePast,
      numberOfMonthsStep
    );

    const numberOfCreatedProvidersPerIteration = Math.ceil(
      minimumNumberOfProvidersToCreate / datesIntervalArray.length
    );

    if ((numberOfMonthsStep * 30) / 3 < numberOfCreatedProvidersPerIteration) {
      throw 'numberOfCreatedProvidersPerIteration must be at maximum: numberOfMonthsStep * 30 (number of days in a month) / 3 (number of maximum days between the creation of each provider)';
    }

    const walletsWithAccountsAndCreationIteration = walletsWithAccounts.map(
      (e) => ({
        wallet: e,
        iteration: Math.floor(Math.random() * datesIntervalArray.length),
      })
    );

    for (let i = 0; i < datesIntervalArray.length; i++) {
      previousProviderCreatedDate = null;

      let numberOfRemainingProvidersThisIteration =
        numberOfCreatedProvidersPerIteration;

      const walletsWithAccountsInCurrentIteration =
        walletsWithAccountsAndCreationIteration.filter(
          (e) => e.iteration === i
        );

      for (let j = 0; j < walletsWithAccountsInCurrentIteration.length; j++) {
        const currentProvider = await factory(Provider)({
          wallet: walletsWithAccountsInCurrentIteration[j].wallet,
          previousProviderCreatedDate,
          fromDateInIteration: datesIntervalArray[i].fromDate,
          toDateInIteration: datesIntervalArray[i].toDate,
          isLastIteration: i === datesIntervalArray.length - 1,
          numberOfCreatedProvidersPerIteration,
        }).create();

        previousProviderCreatedDate = currentProvider.created;
        allProvidersCreated.push(currentProvider);
        numberOfRemainingProvidersThisIteration--;
      }

      for (let j = 0; j < numberOfRemainingProvidersThisIteration; j++) {
        const currentProvider = await factory(Provider)({
          previousProviderCreatedDate,
          fromDateInIteration: datesIntervalArray[i].fromDate,
          toDateInIteration: datesIntervalArray[i].toDate,
          isLastIteration: i === datesIntervalArray.length - 1,
          numberOfCreatedProvidersPerIteration,
        }).create();

        previousProviderCreatedDate = currentProvider.created;
        allProvidersCreated.push(currentProvider);
      }
    }

    const sampleOfProviders = _.shuffle([
      ...allProvidersCreated.slice(0, 6),
      ..._.sampleSize(
        [...allProvidersCreated.slice(6)],
        Math.floor(Math.random() * (minimumNumberOfAssessors + 1)) +
          (maximumNumberOfAssessors - minimumNumberOfAssessors)
      ),
    ]);

    const assessorPromises = sampleOfProviders.map((provider) => {
      return factory(Assessor)({
        provider,
      }).create();
    });

    const assessors = await Promise.all(assessorPromises);

    const configPromises = allProvidersCreated.map((provider) =>
      factory(Config)({
        provider,
      }).create()
    );

    await Promise.all(configPromises);

    // complaints creation process
    const {
      numberOfComplaints,
      minimumPercentageOfComplaintsEvaluated,
      maximumPercentageOfComplaintsEvaluated,
      minimumPercentageOfComplaintsEvaluatedPerAssessor,
      minimumInfringementsPerComplaint,
      maximumInfringementsPerComplaint,
      percentageOfActiveAssessors,
    } = complaintCreationConfig;

    const minimumComplaintsEvaluated = Math.ceil(
      minimumPercentageOfComplaintsEvaluated * numberOfComplaints
    );
    const maximumComplaintsEvaluated = Math.ceil(
      maximumPercentageOfComplaintsEvaluated * numberOfComplaints
    );
    const minimumNumberOfComplaintsEvaluatedPerAssessor = Math.ceil(
      minimumPercentageOfComplaintsEvaluatedPerAssessor * numberOfComplaints
    );

    const activeAssessors = _.sampleSize(
      assessors,
      Math.ceil(assessors.length * percentageOfActiveAssessors)
    );

    const numberOfComplaintsEvaluated =
      Math.floor(
        Math.random() *
          (maximumComplaintsEvaluated - minimumComplaintsEvaluated + 1)
      ) + minimumComplaintsEvaluated;

    const numberOfComplaintsPerAssessor = getRandomIntsWhichSumToX(
      numberOfComplaintsEvaluated,
      activeAssessors.length,
      minimumNumberOfComplaintsEvaluatedPerAssessor
    );

    const cidsForInfringements = [...cids];
    for (let i = 0; i < numberOfComplaintsPerAssessor.length; i++) {
      for (let j = 0; j < numberOfComplaintsPerAssessor[i]; j++) {
        const complaint = await factory(Complaint)({
          assessor: activeAssessors[i],
        }).create();
        const cidsForCurrentComplaint = _.sampleSize(
          cidsForInfringements,
          Math.floor(Math.random() * maximumInfringementsPerComplaint) +
            minimumInfringementsPerComplaint
        );

        for (let k = 0; k < cidsForCurrentComplaint.length; k++) {
          await factory(Infringement)({
            complaint,
            cid: cidsForCurrentComplaint[k],
          }).create();
        }
      }
    }

    for (let i = 0; i < numberOfComplaints - numberOfComplaintsEvaluated; i++) {
      const complaint = await factory(Complaint)({}).create();

      const cidsForCurrentComplaint = _.sampleSize(
        cidsForInfringements,
        Math.floor(Math.random() * maximumInfringementsPerComplaint) +
          minimumInfringementsPerComplaint
      );

      for (let j = 0; j < cidsForCurrentComplaint.length; j++) {
        await factory(Infringement)({
          complaint,
          cid: cidsForCurrentComplaint[j],
        }).create();
      }
    }
  }
}
