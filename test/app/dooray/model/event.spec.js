var DoorayEvent = require('dooray/model/calEvent');
var TZDate = require('common/timezone').Date;

describe('dooray:model/Event', function() {
    var jsonFixtures;

    beforeEach(function() {
        jsonFixtures = fixture.load('dooray/mock_tasks.json');
    });

    afterEach(function() {
        fixture.cleanup();
    });

    it('factory function (create())', function() {
        var e = DoorayEvent.create(jsonFixtures[0]);

        expect(e).toEqual(jasmine.objectContaining({
            title: '스크럼',
            category: 'time',
            dueDateClass: '',
            isAllDay: false,
            starts: new TZDate('2015-10-26T09:40:00+09:00'),
            ends: new TZDate('2015-10-26T10:00:00+09:00')
        }));

        e = DoorayEvent.create(jsonFixtures[1]);

        expect(e).toEqual(jasmine.objectContaining({
            title: '[홍길동]연차',
            category: 'allday',
            dueDateClass: '',
            isAllDay: true,
            starts: new TZDate('2015-10-26T00:00:00+09:00'),
            ends: new TZDate('2015-10-26T23:59:59+09:00')
        }));

        e = DoorayEvent.create(jsonFixtures[2]);

        expect(e).toEqual(jasmine.objectContaining({
            title: '테스트 마일스톤1',
            category: 'milestone',
            dueDateClass: '',
            isAllDay: false,
            starts: new TZDate('2015-10-26T23:29:59+09:00'),
            ends: new TZDate('2015-10-26T23:59:59+09:00')
        }));

        e = DoorayEvent.create(jsonFixtures[3]);

        expect(e).toEqual(jasmine.objectContaining({
            title: '테스트 업무',
            category: 'task',
            dueDateClass: 'morning',
            isAllDay: false,
            starts: new TZDate('2015-10-26T23:29:59+09:00'),
            ends: new TZDate('2015-10-26T23:59:59+09:00')
        }));
    });

    it('raw data', function() {
        var raw = {
            hello: 'world'
        };
        var e = DoorayEvent.create({
            title: '굿',
            category: 'task',
            dueDateClass: 'morning',
            isAllDay: false,
            starts: new TZDate('2015-10-26T23:29:59+09:00'),
            ends: new TZDate('2015-10-26T23:59:59+09:00'),
            raw: raw
        });

        expect(e.raw).toEqual({hello: 'world'});

        raw.hello2 = 'good';

        expect(e.raw).toEqual({hello: 'world', hello2: 'good'});
    });
});

