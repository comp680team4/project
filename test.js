/**
 * Tests a Google Places Autocomplete field
 *
 * @param {*} selector CSS selector for the field
 * @param {*} typedValue Keys to type into the field
 */
function testAutocompleteField(selector, typedValue) {
  console.log('---------- Testing the %s field ----------', selector.replace('#', ''));
  browser.url('http://comp680team4.herokuapp.com');
  var initialValue = $(selector).getValue();
  console.log('The field initially contains: "%s"', initialValue);

  // Clear the value of the field
  $(selector).clearElement();
  browser.pause(100);
  assert.equal($(selector).getValue(), '');

  // Type characters into the field
  $(selector).keys(typedValue);
  console.log('Entered "%s" into the field', typedValue);

  // Pause to allow the autocomplete to populate
  browser.pause(500);

  // Examine the autocomplete suggestions
  var elements = $$('.pac-item-query');
  assert.isAtLeast(elements.length, 1);
  console.log('Found %d suggestions', elements.length);
  elements.forEach(element => {
    console.log(element.getText());
  });

  // Click on one of the autocomplete suggestions
  var selection = elements[0];
  var selectionText = selection.getText();
  selection.click();
  console.log('Clicked on an autocomplete suggestion: "%s"', selectionText);

  $(selector).waitForValue(500);
  var value = $(selector).getValue();
  console.log('The field now contains: "%s"', value);

  // Verify the field has changed
  assert.notStrictEqual(value, initialValue);
  assert.notStrictEqual(value, typedValue);
}

describe('COMP680 Project', function() {
  it('should be online', function() {
    browser.url('http://comp680team4.herokuapp.com');
    assert.equal(browser.getTitle(), 'COMP680 Team 4 Project');
  });

  it('should autocomplete the start field', function() {
    testAutocompleteField('#start', 'University of Southern Cal');
  });

  it('should autocomplete the end field', function() {
    testAutocompleteField('#end', 'California State University, North');
  });
});
