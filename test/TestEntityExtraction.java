import static org.junit.Assert.assertTrue;

import java.util.List;

import processing.ner.NamedEntityExtractor;
import processing.ner.OpenCalaisExtractor;
import cucumber.api.java.en.Given;
import cucumber.api.java.en.Then;
import cucumber.api.java.en.When;



public class TestEntityExtraction {
	private String path;
	private String result;
	private NamedEntityExtractor ner;
	@Given("^there is a text file called \"([^\"]*)\"$")
	public void there_is_a_text_file_called(String path) throws Throwable {
		this.path = path;
	}

	@Given("^there is an open Calais webservice is located at \"([^\"]*)\"$")
	public void there_is_an_open_Calais_webservice_is_located_at(String service) throws Throwable {
	  if(service.toLowerCase().contains("calais")){
			this.ner = new NamedEntityExtractor(new OpenCalaisExtractor());
		}
	}

	@When("^I call the disambiguation service$")
	public void I_call_the_disambiguation_service() throws Throwable {
		this.result = ner.extractAsJson(path);
	}

	@Then("^I am returned a json list of entities that include the following$")
	public void I_am_returned_a_json_list_of_entities_that_include_the_following(List<String> list) throws Throwable {
		String json = "Entity " + result;
		for(String s:list)assertTrue(s,json.contains(s));
	}
	
	@Given("^I bind it as a parameter$")
	public void I_bind_it_as_a_parameter() throws Throwable {

	}

//	@When("^I call the disambiguation service from the following Groovy Script$")
//	public void I_call_the_disambiguation_service_from_the_following_Groovy_Script(String script) throws Throwable {
//	    this.result = new DataBlock("TinkerGraphFactory.createTinkerGraph()").runRule(script).toJson().toString();
//	}

	
	

	

}
